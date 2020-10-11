"use strict"

/*
    Usage example (see https://github.com/jcschmidig/mixed-pipeline#readme)
 */

module.exports = function( errHandler = console.error ) {
    const
    // instantiates the pipeline array
    pipeline = new Array(),

    // adds a process item to the pipeline
    add = (method, arg) => void pipeline.push({ method, arg }),

    // processes the pipeline by injecting the results
    // of the previous to the next item
    execute = (
        $input,             // the pipeline's input given to all process items
        $state = new Map()  // holds the stored functions for all pipelines
        //
    ) => void pipeline.reduce(
        // process every item of the pipleline turn over the result to the next
        async (pipe, item, res) => {
            try { res = processItem(item, $input, await pipe, $state) }
            catch(err) { res = void errHandler({ ...item, input:$input, err }) }
            return res
        },
        // starting with an empty result
        []
    ),

    // adds method and arguments to the pipeline,
    createMethod = method => function(...arg) { add(method, arg); return this },
    createProp = method => ({ value: createMethod(method), writable: false }),
    // define interface's property for given method
    createInterface = (properties, method) =>
        Object.defineProperty( properties, method.name, createProp(method) )

    // exposes the module's interface with all methods defined below
    return methods.reduce(createInterface, { execute })
}

const
// processes the current item of the pipeline
processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the methods below)
    pipelineIsOk(res) && method({ arg, res, input, state }),

// checks if the result of the current pipe is ok
pipelineIsOk = (res) =>
    Array.isArray(res) && !res.includes(null),

// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
// !! every method defined here is automatically populated to the interface !!
methods = [
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, res, input }) {
        return funcs.concurrent(runFunction, res, input)
    },
    // runs the pipe ignoring the result
    function runShadow(args) {
        callMethod('run', args)
        return args.res
    },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, res, input, state }) {
        funcs.map( pack(state, res, input) )
        return res
    },
    // restores the requested results of the state Map into the pipe
    function restore({ arg:funcs, res, state }) {
        return funcs.concurrent(unpack, state)
            .then( states => [ ...res, ...states ] )
    },

    // takes the array of a resulting function and executes
    // the defined pipeline for every item
    function split({ arg:[pipeline], res:[args], state }) {
        return args.map( execPipeline(pipeline, state) )
    },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=debug], res, input }) {
        output(comment, { input: [ ...res, input ] })
        return res
    }
],

// allows a method to be called from within another method
callMethod = (name, args) => methods.find(method => method.name === name)(args),

// Helpers
runFunction = (res, input) => func => func(...res, input),

pack = (state, res, input) => func => state.set(func.name, func(...res, input)),

unpack = state => func => state.get(func.name),

execPipeline = (pipeline, state) => input => pipeline.execute(input, state),

debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')

Array.prototype.concurrent = function(action, ...args) {
    return Promise.all( this.map( action(...args) ))
}
