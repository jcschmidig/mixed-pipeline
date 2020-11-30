"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = function( $errHandler = console.error ) {
    const
    $pipeline = new Array(),

    addToPipeline = method =>
        function(...funcs) {
            $pipeline.push({ method, funcs })
            return this
        },

    execute = (input, state=new Map()) =>
        process(
            $pipeline,
            async (pipe, item) => {
                let  nextPipe
                // every item propagates the resulting pipe to the next item
                try {
                    nextPipe = processItem(item, input, await pipe, state)
                }
                catch(err) {
                    $errHandler.call(this, { ...item, input, err })
                }
                //
                return nextPipe
            }
        )

    // adds all METHODS and the execute function to the interface
    return setMethods(addToPipeline, execute)
}

const
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = [
    // runs all functions in the pipe concurrently
    function run({ funcs, args }) {
        return concurrent(
            funcs,
            func => func.apply(this, args)
        )
    },

    // runs the pipe ignoring the result
    function runShadow(methodArgs) {
        return void runMethod('run', methodArgs)
    },

    // stores the result of the function(s) in the state Map
    function store({ funcs, args, state }) {
        return void concurrent(
            funcs,
            func => state.set(func.name, func.apply(this, args))
        )
    },

    // restores the requested results of the state Map into the pipe
    async function restore({ funcs, pipe, state }) {
        return pipe.concat(
            await concurrent(
                funcs,
                func => state.get(func.name)
            )
        )
    },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ funcs:pipelines, pipe:[inputs], state }) {
        return void concurrent(
            pipelines,
            pipeline => concurrent(
                inputs,
                input => pipeline.execute(input, state)
            )
        )
    },

    // traces the input parameters being consumed by the next method
    function trace({ funcs:[comment='>>> trace', output=debug], args }) {
        return void output.call(this, comment, { args })
    }
],

processItem = ({ method, funcs }, input, pipe, state) =>
    // check and execute the method (one of the METHODS above)
    pipeIsOk(pipe) && (
        method.call(
            this,
            { funcs, pipe, args: pipe.concat(input), state }
        )
        || pipe
    ),

// checking result:   no error catched  and not stopped by consumer
pipeIsOk = pipe => Array.isArray(pipe) && !pipe.includes(null),

// helper
process = (list, processor) => void list.reduce(processor, new Array()),

setMethods = (converter, func) =>
    METHODS.reduce(
        (props, item) =>
            Object.assign(props, { [item.name]: converter.call(this, item) }),
        { [func.name]: func }
    ),

concurrent = (list, processor) => Promise.all( list.map( processor )),

filterByName = value => ({ name }) => name === value,
runMethod = (method, arg) =>
    METHODS.find( filterByName(method) )
           .call(this, arg),

debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
