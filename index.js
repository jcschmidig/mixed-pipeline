"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = ( $errHandler = console.error ) => {
    const
    $pipeline = new Array(),

    addToPipeline = method => function(...arg)
        { return ( $pipeline.push({ method, arg }), this ) },

    execute = (input, state=new Map()) => void $pipeline.process(
        async (pipe, item) => {
            // every item propagates the resulting pipe to the next item
            try { pipe = processItem(item, input, await pipe, state) }
            catch(err) { pipe = void $errHandler.exec({ ...item, input, err }) }
            //
            return pipe
        }
    )

    // adds all METHODS and the execute function to the interface
    return Object.freeze( METHODS.toList(addToPipeline).addFunction(execute) )
}

const
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = [
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, input })
        { return funcs.concurrent( fRun(input) ) },

    // runs the pipe ignoring the result
    function runShadow(args) { return void METHODS.exec('run', args) },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, input, state })
        { return void funcs.concurrent( fStore(state, input) ) },

    // restores the requested results of the state Map into the pipe
    async function restore({ arg:funcs, res, state })
        { return res.concat(await funcs.concurrent( fRestore(state) )) },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ arg:pipelines, res:[args], state })
        { return pipelines.concurrent( pExecute(args, state) ) },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=oDebug], input })
        { return void output.exec(comment, { input }) }
],

processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the METHODS above)
    pipelineIsOk(res) &&
    ( method.exec({ arg, res, input: res.concat(input), state }) || res ),

// checking result:   no error catched  and not stopped by consumer
pipelineIsOk = res => Array.isArray(res) && !res.includes(null),

// helper
fRun = args => f => f.exec(args),
fStore = (state, args) => f => state.set(f.name, f.exec(args)),
fRestore = state => f => state.get(f.name),
fAdd = f => (list, val) => list.addFunction(f ? f.exec(val) : val, val.name),
pExecute = (args, state) => p => args.map( input => p.execute(input, state) ),
oDebug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')

Function.prototype.exec = function(...args)
    { return this.apply(null, Array.isArray(args[0]) ? args[0] : args) }

Array.prototype.exec = function(name, ...args)
    { return this.find(func => func.name === name).exec(args) }

Array.prototype.process = function(reducer)
    { return this.reduce( reducer, [] ) }

Array.prototype.concurrent = function(action)
    { return Promise.all( this.map( action )) }

Array.prototype.toList = function(func)
    { return this.process( fAdd(func) ) }

Array.prototype.addFunction = function(value, name=value.name, enumerable=true)
    { return Object.defineProperty( this, name, { value, enumerable } ) }
