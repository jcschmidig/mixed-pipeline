"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const { isString, isFunction, isArray, isObject } = require('util')
const FUNC_EXECUTE = "execute"
//

module.exports = (...args) => Reflect.construct(Pipe, args)

class Pipe {
    queue
    errHandler
    traceHandler
    propNameInput
    summary
    processInSync

    constructor(queue, options) {
        const opt  = isObject(options) ? options : {}
        this.queue = isArray(queue)    ? queue   : []

        this.errHandler    = opt.errHandler || console.error
        this.traceHandler  = opt.traceHandler || debug
        this.propNameInput = opt.propNameInput || FUNC_EXECUTE
        this.summary       = opt.summary || false
        this.processInSync = opt.processInSync || false
    }

    execute(input, state) {
        return new Queue(this).execute(input, state)
    }
}

class Queue {
    #pp
    #queue

    constructor(pipe) {
        this.#pp    = pipe
        this.#queue = pipe.queue
    }

    // Main method returns a promise with success flag (true/false)
    execute(input, state={}) {
        //
        return this.#queue
            // process the queue items sequentially
            .reduce(
                async (data, item) => this.#serial(await data, item),
                { ...state, [this.#pp.propNameInput]: input }
            )

            // show me what happened and terminate with true
            .then( data => { this.#recap(data); return true } )

            // document any error and terminate with false
            .catch( err => { this.#showError(err); return false } )
    }

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
                return runFunc(pipe, data)

            // 2 - a function and a list of pipes to execute
            case isFunction(head) && this.#hasPipe(tail) :
                return this.#runPipe(head, tail, data)

            // 3 - a caption and optional function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                this.traceHandler(head, reduceWith(tail, data))
                return
        }
        // oops, never mind
        throw unknownType(pipe)
    }

    // prepares running the queues simultaneously
    async #runPipe(func, pipes, data) {
        const result = runFunc(ensureList(func), data)
        //
        const [ args ] = await result
        if (!isArray(args)) throw expectArray(func)
        //
        const process = this.#run(args, pipes, data)

        // check result of queues if executed synchronously
        if (this.#pp.processInSync && !(await process).every( Boolean ))
            throw new Error()
        //
        return result
    }

    // runs the matrix of args and pipes in a promise
    #run(args, pipes, data) {
        const matrix = []
        //
        for(const arg of args) /*  X  */ for(const pipe of pipes)
            matrix.push( pipe.execute(arg, data) )
        //
        return Promise.all(matrix)
    }

    #hasPipe(list) { return list.every( obj => obj instanceof Pipe ) }
    #recap(data)   { this.#pp.summary && this.#pp.traceHandler('summary', data) }
    #showError(e)  { e.message && this.#pp.errHandler(showError(e.message)) }
}

//
const
ensureList       = value => [].concat(value),
collect          = list  => ensureList(list).map( el => el?.name || el ).join(),
hasFunc          = list  => list.every( isFunction ),
runFunc  = (funcs, data) => Promise.all(funcs.map( func => func(data) )),

// convert array to object using desired mapping
mapWith    = (data, funcs) =>
    transform( data, (value, index) => [ funcs[index].name, value ] ),

reduceWith = (funcs, data) =>
    transform( funcs, func => [ func.name, data[func.name] ], data ),

transform  = (list, proc, def={}) =>
    isArray(list) && list.length ? Object.fromEntries(list.map( proc )) : def,

// error handling
objErr      = text  => new Error(text),
unknownType = pipe  => objErr(`Unknown queue type in pipe [${collect(pipe)}].`),
expectArray = func  => objErr(`Result of [${func.name}] should be an Array.`),
showError   = error => `Oops! ${error}\n`,
debug       = (label, data) => console.debug(`\n${label}\n`, data)
