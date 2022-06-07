"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const FUNC_EXECUTE = "execute",
      TYPE         = { String: 'string', Function: 'function' },
      UNKNOWN_TYPE = "Unknown queue type"
//

module.exports = (...args) => new Queue(...args)

class Queue {
    #queue
    #options
    get queue() { return this.#queue || [] }
    get options() { return this.#options || {} }
    get errHandler() { return this.options.errHandler || console.error }
    get traceHandler() { return this.options.traceHandler || debug }
    get funcNameMain() { return this.options.funcNameMain || FUNC_EXECUTE }
    get propNameInput() { return this.options.propNameInput || this.funcNameMain }
    get summary() { return this.options.summary || false }

    constructor(queue, options) {
        this.#queue   = queue
        this.#options = options

        // define public execution method
        Object.defineProperty(this, this.funcNameMain, {
            value: (...args) => this.#execute(...args)
        })
    }

    // Main method
    #execute(input, state={}) {
        this.queue
            // every item is processed sequentially
            .reduce(
                async (data, item) => this.#serial(await data, item),
                { ...state, [ this.propNameInput ]: input }
            )

            // show me what happened
            .then( data => this.#recap(data) )

            // document any error and terminate
            .catch( err => this.#showError(err) )
    }

    #recap(data) { this.summary && this.traceHandler('summary', data) }    
    #showError(error) { this.errHandler(showError(error)) }

    // returns the data for the next item
    async #serial(data, item) {
        const pipe = ensureList(item)
        const result = await this.#process(pipe, data)
        //
        return { ...data, ...mapWith( result, pipe) }
    }

    // handles the different pipe types
    #process(pipe, data) {
        const [ head, ...tail ] = pipe
        let result
        //
        switch(true) {
            // a list of functions to execute
            case hasFunc(pipe) :
                result = this.#runFunc(pipe, data)
                break

            // a function and a list of queues to execute
            case isFunc(head) && hasQueue(tail) :
                result = this.#runPipe(head, tail, data)
                break

            // a caption and optional function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                this.traceHandler(head, reduceWith(tail, data))
                break

            // oops, never mind
            default : throw new Error(pipeError(pipe))
        }
        //
        return result
    }

    // runs all funcs simultaneously and returns a promise
    #runFunc(funcs, data) {
        return Promise.all( funcs.map( func => func(data) ) )
    }

    // prepares running the queues asynchronously
    async #runPipe(func, queues, data) {
        const result = this.#runFunc(ensureList(func), data)
        const [ args ] = await result
        if (!Array.isArray(args)) throw new Error(arrError(func))
        //
        this.#runQueue(args, queues, data)
        //
        return result
    }

    // runs the matrix of args and queues
    #runQueue(args, queues, data) {
        for(const arg of args)
            for(const queue of queues)
                // calls the main method of the queue
                funcMain(queue).call(queue, arg, data)
    }
}

//
const
is       = (value, type) => typeof value === type,
isString         = value => is(value, TYPE.String),
isFunc           = value => is(value, TYPE.Function),
funcMain         = queue => queue[ queue.funcNameMain ],
ensureList       = value => [].concat(value),
hasFunc          = list  => list.every( isFunc ),
hasQueue         = list  => list.every( item => isFunc(funcMain(item))),
collect          = list  => ensureList(list).map( e => e.name || e ).join(),
debug    = (label, data) => console.debug(`\n${label}\n`, data),

// convert array to object using desired mapping
transform  = (list, proc, def={}) =>
    list && list.length
        ? Object.fromEntries(list.map( proc ))
        : def,
mapWith    = (list, prop) => transform( list, (v, i) => [ prop[i].name, v ] ),
reduceWith = (list, prop) =>
    transform( list, v => [ v.name, prop[v.name] ], prop ),

pipeError  = pipe => `${UNKNOWN_TYPE} in pipe [${collect(pipe)}].`,
arrError   = func => `Result of [${func.name}] should be an Array.`,
showError = error => `Oops! ${error.message}\n`
