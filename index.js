"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

const extArray = require('./extArray.js')

module.exports = ( $errHandler = console.error ) => {
    const
    $pipeline = extArray(),

    addToPipeline = method =>
        function(...arg) {
            $pipeline.push({ method, arg:extArray(...arg) })
            return this
        },

    execute = (input, state=new Map()) => void $pipeline.process(
        async (pipe, item) => {
            // every item propagates the resulting pipe to the next item
            try {
                pipe = processItem(item, input, await pipe, state)
            } catch(err) {
                pipe = void $errHandler.apply(null, { ...item, input, err })
            }
            //
            return pipe
        }
    )

    // adds all METHODS and the execute function to the interface
    return Object.freeze(
        METHODS.toList(addToPipeline)
               .addFunction(execute)
    )
}

const
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = new extArray(
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, input }) {
        return funcs.concurrent(
            func => func.apply(null, input)
        )
    },

    // runs the pipe ignoring the result
    function runShadow(args) {
        return void METHODS.exec('run', args)
    },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, input, state }) {
        return void funcs.concurrent(
            func => state.set(func.name, func.apply(null, input))
        )
    },

    // restores the requested results of the state Map into the pipe
    async function restore({ arg:funcs, res, state }) {
        return res.concat(
            await funcs.concurrent(
                func => state.get(func.name)
            )
        )
    },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ arg:pipelines, res:[args], state }) {
        return pipelines.concurrent(
            pipeline => args.map(
                input => pipeline.execute(input, state)
            )
        )
    },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=oDebug], input }) {
        return void output.call(null, comment, { input })
    }
),

processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the METHODS above)
    pipelineIsOk(res) &&
    ( method.call(null, { arg, res, input: res.concat(input), state }) || res ),

// checking result:   no error catched  and not stopped by consumer
pipelineIsOk = res => Array.isArray(res) && !res.includes(null),

// trace helper
oDebug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
