"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const { isString, isFunction, isArray } = require('util')
//

module.exports = class Queue {
    constructor(pipe) {
        this.pipe          = pipe
        this.Pipe          = pipe.constructor
        this.queue         = pipe.queue
        this.traceHandler  = pipe.traceHandler  || debug
    }

    // Main method returns a promise with success flag (true/false)
    execute(input, state={}) {
        //
        return this.queue
            // process the queue items sequentially
            .reduce(
                async (data, item) => this.#process(await data, item),
                // initial value for data
                { ...state, [this.pipe.propNameInput]: input }
            )

            // show me what happened and terminate with success
            .then( data => { this.#recap(data); return true } )

            // document any error and terminate with failure
            .catch( err => { this.#showError(err); return false } )
    }

    /* processes the current item and
       returns the accumulated data for the next item */
    async #process(data, item) {
        const pipe = ensureList(item)
        const result = await this.#handleType(pipe, data)
        //
        return { ...data, ...mapWith( result, pipe) }
    }

    // handles the different pipe types
    #handleType(pipe, data) {
        const [ head, ...tail ] = pipe
        //
        switch(true) {      /* mind the order */
            // 1 - a list of functions to execute
            case hasFunc(pipe) :
                return runFunc(pipe, data)

            // 2 - a function and a list of pipes to execute
            case isFunction(head) && this.#hasPipe(tail) :
                return this.#runPipe(head, tail, data)

            // 3 - a caption and optinal function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                const trace = tail.length ? reduceWith(tail, data) : data
                this.traceHandler(head, trace)
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
        const ramp = this.#launch(args, pipes, data)

        // check result of queues if executed synchronously
        if (this.pipe.processInSync && !(await ramp).every( Boolean ))
            throw new Error()
        //
        return result
    }

    // runs the matrix of args and pipes in a promise
    #launch(args, pipes, data) {
        const matrix = []
        //
        for(const pipe of pipes) /*  X  */ for(const arg of args)
            matrix.push( pipe.execute(arg, data) )
        //
        return Promise.all(matrix)
    }

    #hasPipe(list) { return list.every( obj => obj instanceof this.Pipe ) }
    #recap(res)    { this.pipe.summary && this.traceHandler('summary', res) }
    #showError(e)  { e.message && this.pipe.errHandler(showError(e.message)) }
}

//
const
ensureList       = val => [].concat(val),
collect          = list => ensureList(list).map( e => e?.name || e ).join(', '),
hasFunc          = list => list.every( isFunction ),
runFunc = (funcs, data) => Promise.all(funcs.map( func => func(data) )),

// convert array to object using desired mapping
mapWith    = (data, funcs) =>
    transform( data, (value, index) => [ funcs[index].name, value ] ),

reduceWith = (funcs, data) =>
    transform( funcs, func => [ func.name, data[func.name] ] ),

transform  = (list, proc) => Object.fromEntries( (list || []).map( proc ) ),

// error handling
objErr      = text => new Error(text),
unknownType = pipe => objErr(`Unknown queue type in pipe [ ${collect(pipe)} ].`),
expectArray = func => objErr(`Result of [${func.name}] should be an Array.`),
showError   = msg  => `Oops! ${msg}\n`,
debug = (label, data) => console.debug(`\n${label}\n`, data)
