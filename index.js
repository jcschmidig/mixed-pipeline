"use strict"
/*
    Usage: see https://github.com/jcschmidig/mixed-pipeline#readme
 */

module.exports = ( $errHandler = console.error ) => {
    const
    $pipeline = new Array(),

    addToPipeline = method => function(...arg)
        { return $pipeline.push({ method, arg }) && this },

    execute = (input, state=new Map()) => void $pipeline.process(
        async (pipe, item) => {
            // every item propagates the resulting pipe to the next item
            try { pipe = processItem(item, input, await pipe, state) }
            catch(err) { pipe = void $errHandler.exec({ ...item, input, err }) }
            //
            return pipe
        }
    )

    return {
        // adds the pipeline's EXECUTE method to the interface
        execute,
        // adds all other METHODS to the interface
        ...METHODS.toObject( addToPipeline )
    }
}

const
// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
METHODS = [
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, res, input })
        { return funcs.concurrent( fRun(res, input) ) },

    // runs the pipe ignoring the result
    function runShadow(args) { return void METHODS.exec('run', args) },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, res, input, state })
        { return void funcs.concurrent( fStore(state, res, input) ) },

    // restores the requested results of the state Map into the pipe
    async function restore({ arg:funcs, res, state })
        { return [ ...res, ...(await funcs.concurrent( fRestore(state) )) ] },

    // takes an array and executes the new pipelines for every item concurrently
    function split({ arg:pipelines, res:[args], state })
        { return pipelines.concurrent( pExecute(args, state) ) },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment='>>> trace', output=oDebug], res, input })
        { return void output.exec(comment, { input: [ ...res, input ] }) }
],

processItem = ({ method, arg }, input, res, state) =>
    // check and execute the method (one of the METHODS above)
    pipelineIsOk(res) && (method.exec({ arg, res, input, state }) || res),

// checking result:   no error catched  and not stopped by consumer
pipelineIsOk = res => Array.isArray(res) && !res.includes(null),

// helper
fMerge = (f, res, input) => f.exec(...res, input),
fRun = (res, input) => f => fMerge(f, res, input),
fStore = (state, res, input) => f => state.set(f.name, fMerge(f, res, input)),
fRestore = state => f => state.get(f.name),
pExecute = (args, state) => p => args.map( input => p.execute(input, state) ),
oDebug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')

Function.prototype.exec = function(...args) { return this.apply(null, args) }

Array.prototype.exec = function(name, ...args)
    { return this.find(func => func.name === name).exec(...args) }

Array.prototype.toObject = function(func)
    { return Object.fromEntries( this.map( value =>
        [ value.name, func ? func.exec(value) : value ] )) }

Array.prototype.process = function(reducer, initValue=[])
    { return this.reduce( reducer, initValue ) }

Array.prototype.concurrent = function(action)
    { return Promise.all( this.map( action )) }
