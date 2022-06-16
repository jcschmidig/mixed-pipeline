"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const { isBoolean, isString, isFunction, isArray } = require('util')
//

module.exports = class Queue {
    //
    constructor(pipe) {
        this.pipe          = pipe
        this.Pipe          = pipe.constructor
        this.queue         = pipe.queue
        this.traceHandler  = pipe.traceHandler  || debug
    }

    // Main method returns a promise with success flag (true/false)
    execute(input, state={}) { return(
        this.queue
            // process the queue items sequentially
            .reduce(
                (data, item) => data.then(this.process(ensureList(item))),
                // initial value for data
                Promise.resolve({ ...state, [this.pipe.propNameInput]: input })
            )

            // show me what happened and terminate with success
            .then(this.execReturn(this.recap, true))

            // document any error and terminate with failure
            .catch(this.execReturn(this.showError, false))
    )}

    /* processes the current item and
       returns the accumulated data for the next item */
    process(pipe) { return(
        data => Promise.resolve(this.handleType(pipe, data))
                       .then(ensureList)
                       .then(mergeData(pipe, data))
    )}

    // handles the different pipe types
    handleType(pipe, data) {
        const [ head, ...tail ] = pipe
        //
        switch(true) {      /* mind the order */
            // 1 - a list of functions to execute
            case hasFunc(pipe) :
                return runFunc(pipe, data)

            // 2 - a function and a list of pipes to execute
            case isFunction(head) && this.hasPipe(tail) :
                return this.runPipe(head, tail, data)

            // 3 - a caption and optional function results to trace the pipeline
            case isString(head) && hasFunc(tail) :
                return this.traceHandler(head, reduceWith(tail, data))
        }
        // oops, never mind
        throwError(unknownType(pipe))
    }

    // launches the queues simultaneously and sync-s on demand
    runPipe(func, pipes, data) { return(
        runFunc(ensureList(func), data)
            .then(result => {
                const args = checkArray(result[0], func)
                const queues = this.launch(args, pipes, data)
                //
                return this.maySync(queues, result)
            })
    )}

    /* returns the result either in a promise after checking the queues' state
       or directly without considering it */
    maySync(queues, result) { return(
        this.pipe.processInSync
            ? queues.then(hasSuccess)
                    .then(checkState(result))
            : result
    )}

    // runs the matrix of args and pipes in a promise
    launch(args, pipes, data) {
        const matrix = []
        //
        for(const pipe of pipes) /*  X  */ for(const arg of args)
            matrix.push( pipe.execute(arg, data) )
        //
        return Promise.all(matrix)
    }

    hasPipe(list) { return list.every( obj => obj instanceof this.Pipe ) }
    execReturn(func, ret) { return arg => (func.call(this, arg), ret) }
    recap(data)   { this.pipe.summary && this.traceHandler('summary', data) }
    showError(e)  { e.message && this.pipe.errHandler(dispError(e.message)) }
}

//
const
ensureList       = val  => [].concat(val),
collect          = list => ensureList(list)
                           .map( elem => elem && elem.name || `"${elem}"` )
                           .join(', '),
hasFunc          = list => list.every( isFunction ),
runFunc = (funcs, data) => Promise.all(funcs.map( func => func(data) )),
hasSuccess       = list => list.every( isSuccess ),
isSuccess         = val => isBoolean(val) && val,
mergeData = (pipe, data) => result => ({ ...data, ...mapWith(result, pipe) }),

// convert array to object using desired mapping
mapWith    = (data, funcs) =>
    transform( data, (value, index) => [ funcs[index].name, value ] ),

reduceWith = (funcs, data) =>
    transform( funcs, ({name}) => [ name, data[name] ], data ),

transform  =  (list, proc, defValue={}) =>
    list.length
        ? Object.fromEntries( list.map( proc ) )
        : defValue,

// error handling
check = (cond, value=cond, errMsg) => cond && value || throwError(errMsg),
throwError  = msg  => { throw Error(msg) },
checkState = result => state => check(state, result),
checkArray = (arr, msg) => check(isArray(arr), arr, expectArray(msg)),
unknownType = pipe => `Unknown queue type in pipe [ ${collect(pipe)} ].`,
expectArray = ({name}) => `Result of [${name}] should be an Array.`,
dispError   = msg  => `Oops! ${msg}\n`,
debug = (label, data) => console.debug(`\n${label}\n`, data)
