"use strict"

/*
    Usage example: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = ( $errHandler = console.error ) => {
    const
    $pipeline = new Array(),

    createFunc = method => function(...arg) {
        // adds method and arguments to the pipeline
        $pipeline.push({ method, arg })
        return this
    },

    execute = (input, state=new Map()) => void $pipeline.process(
        async (pipe, item) => {
            try {
                // every item propagates the resulting pipe to the next item
                pipe = processItem(item, input, await pipe, state)
            } catch(err) {
                pipe = void $errHandler.exec({ ...item, input, err })
            }
            return pipe
        }
    )

    return {
        // adds the pipeline's EXECUTE method to the interface
        execute,
        // adds all other METHODS to the interface
        ...Object.fromEntries( getMethods(createFunc) )
    }
}

const
getMethods = func => METHODS.map( method => [ method.name, func.exec(method) ]),
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
// !! every method defined here is automatically populated to the interface !!
METHODS = [
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
    async function restore({ arg:funcs, res, state }) {
        return [ ...res, ...(await funcs.concurrent(unpack, state)) ]
    },

    // takes the array of a resulting function and executes
    // the defined pipeline for every item
    function split({ arg:[pipeline], res:[args], state }) {
        return args.map( execPipeline(pipeline, state) )
    },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=debug], res, input }) {
        output.exec(comment, { input: [ ...res, input ] })
        return res
    }
],

// allows a method to be called from within another method
callMethod = (name, args) =>
    METHODS.find(method => method.name === name)
           .exec(args),

// processes the current item of the pipeline
processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the METHODS below)
    pipelineIsOk(res) && method.exec({ arg, res, input, state }),
//
pipelineIsOk = res =>
    // no error catched & not stopped by consumer
    Array.isArray(res) && !res.includes(null),

// Helpers
runFunction = (res, input) => func => func.exec(...res, input),

pack = (state, res, input) => func =>
    state.set(func.name, func.exec(...res, input)),
unpack = state => func => state.get(func.name),

execPipeline = (pipeline, state) => input => pipeline.execute(input, state),

debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')

Function.prototype.exec = function(...args) {
    return this.apply(null, args)
}
Array.prototype.process = function(reducer, initValue=[]) {
    return this.reduce( reducer, initValue )
}
Array.prototype.concurrent = function(action, ...args) {
    return Promise.all( this.map( action.exec(...args) ))
}
