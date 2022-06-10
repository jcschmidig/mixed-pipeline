"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const { isString, isFunction, isArray, isObject } = require('util')
const FUNC_EXECUTE = "execute",
      TYPE         = { String: 'string', Function: 'function' }
//

module.exports = (...args) => new Queue(...args)

class Queue {
    #queue
    #options
    get errHandler()    { return this.#options.errHandler || console.error }
    get traceHandler()  { return this.#options.traceHandler || debug }
    get propNameInput() { return this.#options.propNameInput || FUNC_EXECUTE }
    get summary()       { return this.#options.summary || false }
    get processInSync() { return this.#options.processInSync || false }

    constructor(queue, options) {
        this.#queue   = isArray(queue)    ? queue   : []
        this.#options = isObject(options) ? options : {}
        //
        Object.defineProperty(this, FUNC_EXECUTE, { value: this.#execute })
    }

    // Main method returns a promise with success flag (true/false)
    #execute(input, state={}) {
        //
        return this.#queue
            // process the queue items sequentially
            .reduce(
                async (data, item) => this.#serial(await data, item),
                { ...state, [ this.propNameInput ]: input }
            )

            // show me what happened and terminate with true
            .then( data => { this.#recap(data); return true } )

            // document any error and terminate with false
            .catch( err => { this.#showError(err); return false } )
    }

    #recap(data)  { this.summary && this.traceHandler('summary', data) }
    #showError(e) { e.message && this.errHandler(showError(e)) }

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
        switch(true) {      /* mind the order */
            // 1 - a list of functions to execute
            case hasFunc(pipe) :
                return this.#runFunc(pipe, data)

            // 2 - a function and a list of queues to execute
            case isFunction(head) && this.#hasQueue(tail) :
                return this.#runPipe(head, tail, data)

            // 3 - a caption and optional function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                this.traceHandler(head, reduceWith(tail, data))
                return
        }
        // oops, never mind
        throw unknownType(pipe)
    }

    #hasQueue(list) {
        return list.every( obj => obj instanceof this.constructor )
    }

    // runs all funcs simultaneously and returns the result as a promise
    #runFunc(funcs, data) {  return Promise.all( mapFunc(funcs, data) ) }

    // prepares running the queues simultaneously
    async #runPipe(func, queues, data) {
        const result = this.#runFunc(ensureList(func), data)
        //
        const [ args ] = await result
        if (!isArray(args)) throw expectArray(func)
        //
        const process = this.#runQueue(args, queues, data)

        // check result of queues if executed synchronously
        if (this.processInSync && !(await process).every( Boolean ))
            throw new Error()
        //
        return result
    }

    // runs the matrix of args and queues in a promise
    #runQueue(args, queues, data) {
        const matrix = []
        //
        for(const arg of args) /*  X  */ for(const queue of queues)
            matrix.push( queue.#execute(arg, data) )
        //
        return Promise.all(matrix)
    }
}

//
const
ensureList       = value => [].concat(value),
collect          = list  => ensureList(list).map( el => el?.name || el ).join(),
hasFunc          = list  => list.every( isFunction ),
mapFunc = (list, ...arg) => list.map( func => func(...arg) ),

// convert array to object using desired mapping
transform  = (list, proc, def={}) => isArray(list) && list.length
    ? Object.fromEntries(list.map( proc )) : def,
mapWith    = (list, prop) => transform( list, (v, i) => [ prop[i].name, v ] ),
reduceWith = (list, prop) =>
    transform( list, v => [ v.name, prop[v.name] ], prop ),

// error handling
objErr       = text => new Error(text),
unknownType  = pipe => objErr(`Unknown queue type in pipe [${collect(pipe)}].`),
expectArray  = func => objErr(`Result of [${func.name}] should be an Array.`),
showError   = error => `Oops! ${error.message}\n`,
debug    = (label, data) => console.debug(`\n${label}\n`, data)
