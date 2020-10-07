"use strict"

module.exports = pipeline

const { error:cError, debug:cDebug } = console,

// Ensures that every action returns as a promise
doAction = (action, res, input) =>
    Promise.resolve(action(...res, input)),
// runs all functions in the pipe concurrently
doRun = ({ arg:funcs, res, input }) =>
    Promise.all(funcs.map( func => doAction(func, res, input) )),

methods = {
    run: doRun,
    // runs the pipe ignoring the result
    runShadow: args => ( void doRun(args), args.res ),

    // stores the result of the function(s) in the state Map
    store: ({ arg:funcs, res, input, state }) => (
        void funcs.map( func =>
            state.set(func.name, doAction(func, res, input)) )
        , res ),
    // inserts the stored function(s) of the state Map into the pipe
    restore: ({ arg:funcs, res, state }) =>
        Promise.all(funcs.map( ({name}) => state.get(name) ))
               .then( actions => [ ...res, ...actions ] ),

    // takes the array of a resulting function and executes the defined pipeline
    // for every item
    split: ({ arg:[pipeline], res:[args], state }) =>
        args.map( arg => pipeline.execute(arg, state) ),

    // traces the input parameters being consumed by the next method
    trace: ({ res, input }) => ( void
        cDebug('>>> trace\n', { input: [...res, input] }), res )
},

// checks if the current pipe is ok
pplIsOk = res => Array.isArray(res) && !res.includes(null),

// processes the current item of the pipeline
doProcess = ({ method, arg }, input, res, state) =>
    // method is one of the methods above
    pplIsOk(res) && method({ arg, res, input, state })

// initializes the pipeline
function pipeline( errHandler = cError ) {
    // instantiates the pipeline array with an empty promise
    const pipeline = new Array(Promise.resolve(new Array())),

    // processes the pipeline by injecting the results to the next item
    execute = (input, state=new Map()) => void pipeline.reduce(
        (pipe, process) => pipe
            // waits for the promise to be resolved and gives the result
            // to the next item
            .then( res => doProcess(process, input, res, state) )
            // catches any error occurring during the pipeline's processing
            .catch( err => void errHandler({ ...process, input, err }) ))

    // exposes the interface with all methods
    return Object.entries(methods).reduce(
        (out, [name, method]) =>
            // define a property for every method
            Object.defineProperty(
                out,
                name,
                // adds the method to the pipeline,
                // returns the whole pipeline offering the methods be be chained
                { value: function(...arg) { pipeline.push({ method, arg });
                                            return this } }
            )
        // initial value for out
        , { execute } )
}
