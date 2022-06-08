"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const { isString, isFunction, isArray } = require('util')

const FUNC_EXECUTE = "execute",
      TYPE         = { String: 'string', Function: 'function' },
      UNKNOWN_TYPE = "Unknown queue type"
//

module.exports = (...args) => new Queue(...args)

class Queue {
    #queue
    #options
    #invalid
    get queue() { return this.#queue || [] }
    get options() { return this.#options || {} }
    get processInSync() { return this.options.processInSync || false }
    get errHandler() { return this.options.errHandler || console.error }
    get traceHandler() { return this.options.traceHandler || debug }
    get funcNameMain() { return this.options.funcNameMain || FUNC_EXECUTE }
    get propNameInput() { return this.options.propNameInput || this.funcNameMain }
    get summary() { return this.options.summary || false }

    #isNameInvalid() {
        return classProperties(Queue).find(name => name === this.funcNameMain)
    }

    constructor(queue, options) {
        this.#queue   = queue
        this.#options = options

        // check execution name
        if (this.#invalid = this.#isNameInvalid())
            this.#showError(nameError(this.funcNameMain))

        // define public execution method
        defineMain(this, this.#execute)
    }

    // Main method
    #execute(input, state={}) {
        if (this.#invalid) return Promise.resolve(false)
        //
        return this.queue
            // process the queue items sequentially
            .reduce(
                async (data, item) => this.#serial(await data, item),
                { ...state, [ this.propNameInput ]: input }
            )

            // show me what happened and terminate with true
            .then( this.#recap.bind(this) )
            .then( _ => true )

            // document any error and terminate
            .catch( this.#showError.bind(this) )
    }

    #recap(data)  { this.summary && this.traceHandler('summary', data) }
    #showError(e) { this.errHandler(showError(e)); return false }

    /* processes the current item and
       returns the accumulated data for the next item */
    async #serial(data, item) {
        const pipe = ensureList(item)
        const result = await this.#process(pipe, data)
        //
        return { ...data, ...mapWith( result, pipe) }
    }

    // handles the different pipe types
    #process(pipe, data) {
        const [ head, ...tail ] = pipe
        //
        switch(true) {
            // a list of functions to execute
            case hasFunc(pipe) :
                return this.#runFunc(pipe, data)

            // a function and a list of queues to execute
            case isFunction(head) && hasQueue(tail) :
                return this.#runPipe(head, tail, data)

            // a caption and optional function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                this.traceHandler(head, reduceWith(tail, data))
                return
        }
        // oops, never mind
        throw pipeError(pipe)
    }

    // runs all funcs simultaneously and returns the result as a promise
    #runFunc(funcs, data) {
        return Promise.all( mapFunc(funcs, data) )
    }

    // prepares running the queues simultaneously
    async #runPipe(func, queues, data) {
        const result = this.#runFunc(ensureList(func), data)
        //
        const [ args ] = await result
        if (!isArray(args)) throw arrError(func)
        //
        const process = this.#runQueue(args, queues, data)

        // check result of queues if executed synchronously
        if (this.processInSync && !has(await process, Boolean))
            throw processError()
        //
        return result
    }

    // runs the matrix of args and queues as a Promise
    #runQueue(args, queues, data) {
        const matrix = []
        for(const arg of args) /*  X  */ for(const queue of queues)
            matrix.push( run(queue, arg, data) )
        //
        return Promise.all(matrix)
    }
}

//
const
descriptor       = Object.getOwnPropertyDescriptor,
defProperty      = Object.defineProperty,
classProperties  = cls   => Object.getOwnPropertyNames(cls.prototype),
ensureList       = value => [].concat(value),
collect          = list  => ensureList(list).map( el => el?.name || el ).join(),
has       = (list, func) => list.every( func ),
hasFunc          = list  => has(list, isFunction),
hasQueue         = list  => has(list, funcMain?.bind(isFunction)),
mapFunc = (list, ...arg) => list.map( func => func(...arg)),

propMain         = obj   => [ obj, obj.funcNameMain ],
funcMain         = obj   => descriptor( ...propMain(obj) )?.value,
defineMain = (obj, func) => defProperty( ...propMain(obj), { value: func } ),
run   = (obj, arg, data) => funcMain(obj).call(obj, arg, data),

debug    = (label, data) => console.debug(`\n${label}\n`, data),

// convert array to object using desired mapping
transform  = (list, proc, def={}) =>
    list && list.length ? Object.fromEntries(list.map( proc )) : def,
mapWith    = (list, prop) => transform( list, (v, i) => [ prop[i].name, v ] ),
reduceWith = (list, prop) =>
    transform( list, v => [ v.name, prop[v.name] ], prop ),

objErr    = text => new Error(text),
nameError = name => objErr(`Option funcNameMain '${name}' is invalid.`),
pipeError = pipe => objErr(`${UNKNOWN_TYPE} in pipe [${collect(pipe)}].`),
processError = _ => objErr(`Failure in sub processe(s).`),
arrError  = func => objErr(`Result of [${func.name}] should be an Array.`),
showError = error => `Oops! ${error.message}\n`
