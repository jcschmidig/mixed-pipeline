"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = function( $errHandler = console.error ) {
    const
    $pipeline = new List(),

    addToPipeline = method =>
        function(...funcs) {
            $pipeline.push({ method, funcs: List.from(funcs) })
            return this
        },

    execute = (input, state=new Map()) =>
        $pipeline.process(
            async (pipe, item) => {
                let res
                // every item propagates the resulting pipe to the next item
                try { res = processItem(item, input, await pipe, state) }
                catch(err) { $errHandler({ ...item, input, err }) }
                //
                return res
            }
        )

    // adds all METHODS and the execute function to the interface
    return { execute, ...METHODS.build( wrapper(addToPipeline) ) }
}

const List = class extends Array {
    build(processor) { return this.reduce( processor, new Object ) }
    process(processor) { return void this.reduce( processor, new Array() ) }
    concurrent(processor) { return Promise.all( this.map( processor )) }
    findByName(value) { return this.find( ({ name }) => name === value ) }
},
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = List.from([
    // runs all functions in the pipe concurrently
    function run({ funcs, args }) { return funcs.concurrent( fapply(args) ) },

    // runs the pipe ignoring the result
    function runShadow(props) { return void runMethod('run', props) },

    // stores the result of the function(s) in the state Map
    function store({ funcs, args, state })
        { return void funcs.concurrent( fset(state, args) ) },

    // restores the requested results of the state Map into the pipe
    async function restore({ funcs, pipe, state })
        { return pipe.concat( await funcs.concurrent( fget(state) )) },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ funcs:pipelines, pipe:[input], state })
        { return void pipelines.concurrent( pexec(input, state) ) },

    // traces the input parameters being consumed by the next method
    function trace({ funcs:[comment='>>> trace', output=debug], args })
        { return void output(comment, { args }) }
]),

processItem = ({ method, funcs }, input, pipe, state) =>
    isBroken(pipe)
        || method({ funcs, pipe, args:pipe.concat(input), state })
        || pipe,

// checking pipe:         error catched or stopped by consumer
isBroken = pipe => !Array.isArray(pipe) || pipe.includes(null),

// helper
wrapper = id => (obj, fn) => ( obj[fn.name] = id(fn), obj ),
runMethod = (name, arg) => METHODS.findByName(name).call(this, arg),
fapply =       args  => func => func.apply(this, args),
fset = (state, args) => func => state.set(func.name, fapply(args)(func)),
fget =  state        => func => state.get(func.name),
pexec = (args, state) => ppl => args.map( input => ppl.execute(input, state) ),
debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
