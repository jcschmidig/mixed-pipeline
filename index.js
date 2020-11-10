"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = function( $errHandler = console.error ) {
    const
    $pipeline = new Array(),

    addToPipeline = method =>
        function(...arg) {
            $pipeline.push({ method, arg })
            return this
        },

    execute = (input, state=new Map()) =>
        process(
            $pipeline,
            async (pipe, item) => {
                // every item propagates the resulting pipe to the next item
                try {
                    pipe = processItem(item, input, await pipe, state)
                } catch(err) {
                    pipe = void $errHandler.call(this, { ...item, input, err })
                }
                //
                return pipe
            }
        )

    // adds all METHODS and the execute function to the interface
    return Object.freeze( addMethods(addToPipeline, execute) )
}

const
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = [
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, input }) {
        return concurrent(
            funcs,
            func => func.apply(this, input)
        )
    },

    // runs the pipe ignoring the result
    function runShadow(args) {
        return void runMethod('run', args)
    },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, input, state }) {
        return void concurrent(
            funcs,
            func => state.set(func.name, func.apply(this, input))
        )
    },

    // restores the requested results of the state Map into the pipe
    async function restore({ arg:funcs, res, state }) {
        return res.concat(
            await concurrent(
                funcs,
                func => state.get(func.name)
            )
        )
    },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ arg:pipelines, res:[args], state }) {
        return void concurrent(
            pipelines,
            pipeline => args.map(
                input => pipeline.execute(input, state)
            )
        )
    },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=debug], input }) {
        return void output.call(this, comment, { input })
    }
],

processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the METHODS above)
    pipelineIsOk(res) &&
    (
        method.call(
            this,
            { arg, res, input: res.concat(input), state }
        )
        || res
    ),

// checking result:   no error catched  and not stopped by consumer
pipelineIsOk = res => Array.isArray(res) && !res.includes(null),

// helper
process = (obj, processor) =>
    void obj.reduce( processor, new Array() ),

id = arg => arg,
addMethods = (converter=id, init) =>
    METHODS.reduce(
        (list, item) =>
            addFunction(converter.call(this, item), item.name, list),
        init ? addFunction(init) : new Array()
    ),
addFunction = (value, name=value.name, list=[], enumerable=true) =>
    Object.defineProperty(
        list,
        name,
        { value, enumerable }
    ),

concurrent = (obj, action) => Promise.all( obj.map( action )),
runMethod = (name, arg) =>
    METHODS.find(item => item.name === name)
           .call(this, arg),

debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
