"use strict"

/*
    Usage example (see https://github.com/jcschmidig/mixed-pipeline#readme)
    -----------------------------------------------------------------------

    import fs from 'fs/promises'
    import pipeline from 'mixed-pipeline'

    pipeline()
        .store(getTemplate)
        .run(findPaths)     // returns an array of subPaths
        .split(pipeline()   // executes a new pipeline for every subPath
            .restore(getTemplate)
            .run(writeConfig)
        )
    .execute("/myPath")     // starts the pipeline with the given path

    function getTemplate(path) {
        return fs.readFile(path+'/template.json')
    }

    function findPaths(path) {
        return fs.readdir(path)
    }

    function writeConfig(template, subPath) {
        void fs.writeFile(subPath+'/config.json', template)
    }
 */

module.exports = function( errHandler = console.error ) {
    const
    // instantiates the pipeline array with a promise of an empty array
    pipeline = new Array( Promise.resolve(new Array()) ),

    // adds a process item to the pipeline
    add = (method, arg) => pipeline.push({ method, arg }),

    // processes the pipeline by injecting the results
    // of the previous to the next item
    execute = (
        input,              // the pipeline's input given to all process items
        state = new Map()   // holds the stored functions for all pipelines
        //
    ) => void pipeline.reduce(
        (pipe, process) => pipe
            // waits for the promise to be resolved and gives the result
            // to the next process item
            .then( res => doProcess(process, input, res, state) )
            // catches any error occurring during the pipeline's processing
            .catch( err => void errHandler({ ...process, input, err }) ))

    // exposes the module's interface with all methods defined below
    return methods.reduce(
        ($interface, method) =>
            // define a property for every method
            Object.defineProperty(
                $interface,
                method.name,
                // adds method and arguments to the pipeline,
                {
                    value: function(...arg) { add(method, arg); return this }
                }
            )
        // initial value of $interface
        , { execute } )
}

// processes the current item of the pipeline
function doProcess({ method, arg }, input, res, state) {
    // check and execute the method (one of the methods below)
    return pplIsOk(res) && method({ arg, res, input, state })
}
// checks if the result of the current pipe is ok
function pplIsOk(res) { return Array.isArray(res) && !res.includes(null) }

const
// ensures that every action returns as a promise
doAction = (action, res, input) =>
    Promise.resolve(action(...res, input)),

// allows a method to be called from within another method
method = (name, args) => methods.find(method => method.name === name)(args),

// this array has two purposes (see exported function)
//  - the method definition is used to build the pipeline's interface
//  - the method body is being executed while processing the pipeline
// !! every method defined here is automatically populated to the interface !!
methods = [
    // runs all functions in the pipe concurrently
    function run({ arg:funcs, res, input }) {
        return Promise.all(funcs.map( func => doAction(func, res, input) ))
    },
    // runs the pipe ignoring the result
    function runShadow(args) {
        // uses the already defined function 'run'
        method('run', args)
        return args.res
    },

    // stores the result of the function(s) in the state Map
    function store({ arg:funcs, res, input, state }) {
        funcs.map( func => state.set(func.name, doAction(func, res, input)) )
        return res
    },
    // inserts the stored function(s) of the state Map into the pipe
    function restore({ arg:funcs, res, state }) {
        return Promise.all(funcs.map( func => state.get(func.name) ))
                      .then( actions => [ ...res, ...actions ] )
    },

    // takes the array of a resulting function and executes
    // the defined pipeline for every item
    function split({ arg:[pipeline], res:[args], state }) {
        return args.map( arg => pipeline.execute(arg, state) )
    },

    // traces the input parameters being consumed by the next method
    function trace({ arg:[comment = '>>> trace'], res, input }) {
        console.debug(`${comment}\n`, { input: [ ...res, input ] }, '\n')
        return res
    }
]
