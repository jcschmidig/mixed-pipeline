"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const FUNC_EXECUTE = "execute",
      TYPE         = { String: 'string', Function: 'function' },
      UNKNOWN_TYPE = "unknown queue type"
//

module.exports = (...args) => new Queue(...args)

class Queue {
    #queue
    #options
    get queue() { return this.#queue || [] }
    get options() { return this.#options || {} }
    get errHandler() { return this.options.errHandler || console.error }
    get traceHandler() { return this.options.traceHandler || debug }
    get propNameInput() { return this.options.propNameInput || FUNC_EXECUTE }
    get summary() { return this.options.summary || false }

    constructor(queue, options) {
        this.#queue   = queue
        this.#options = options

        // define public execution method
        Object.defineProperty(this, FUNC_EXECUTE, {
            value: (...args) => this.#execute(...args)
        })
    }

    #execute(input, state={}) {
        this.queue
            // every item is processed sequentially
            .reduce(
                async (data, item) => this.#serial(await data, item),
                { ...state, [this.propNameInput]: input }
            )
            // show me what happened
            .then( data => this.#recap(data) )
            // document any error and terminate
            .catch( err => this.#showError(err) )
    }

    #recap(data) { this.summary && this.traceHandler('summary', data) }

    async #serial(data, item) {
        const pipe = ensureList(item)
        const result = await this.#process(pipe, data)
        //
        return { ...data, ...mapWith( result, pipe) }
    }

    // may return a promise
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

    async #runPipe(func, queues, data) {
        const args = await func(data)
        if (!Array.isArray(args)) throw new Error(arrError(func))
        for(const arg of args) queues.map( this.#runQueue(arg, data) )
        //
        return [ args ]
    }

    #runQueue(arg, data) { return queue => queue[FUNC_EXECUTE](arg, data) }

    #showError(error) { this.errHandler(showError(error)) }
}

//
const
isString         = value => typeof value === TYPE.String,
isFunc           = value => typeof value === TYPE.Function,
ensureList       = value => [].concat(value),
hasFunc   = (list, prop) => list.every( e => isFunc(prop ? e[prop] : e) ),
hasQueue         = list  => hasFunc(list, FUNC_EXECUTE),
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

pipeError  = pipe => `${UNKNOWN_TYPE} in pipe [${collect(pipe)}]`,
arrError   = func => `result of [${func.name}] should be an Array!`,
showError = error => `ERROR: ${error.message}`
