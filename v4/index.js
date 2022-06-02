"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const FUNCNAME_EXECUTE = "execute",
      TYPE             = { String: 'string', Function: 'function' },
      UNKNOWN_TYPE     = "unknown queue type"
//
module.exports = (  queue,
                    // options
                    { errHandler    = console.error,
                      traceHandler  = debug,
                      propNameInput = FUNCNAME_EXECUTE,
                      summary       = false
                    } = {}
                 ) =>
({
    [ FUNCNAME_EXECUTE ]: ($input, $state={}) => void
        queue.reduce(
            async (prState, pipe) => process(pipe, await prState, traceHandler),
            Promise.resolve({ ...$state, [ propNameInput ]: $input })
        )
        .catch( errHandler )
        .then( data => summary && traceHandler('summary', data) )
})
//
const process = async (pipe, data, traceHandler) => {
    const [ head, ...tail ] = pipe = [].concat(pipe)
    const  exec = pipe => run(pipe, data)
    let result, input
    //
    switch(true) {
        // a list of functions to execute
        case hasFunction(pipe) :
            result = await exec(pipe)
            break

        // a function and a list of pipeline objects to execute
        case isFunc(head) && hasPipeline(tail) :
            [input] = result = await exec([ head ])
            fork(input, tail, data)
            break

        // a caption and optional function results to trace the pipeline
        case isString(head) && hasFuncOrIsEmpty(tail) :
            traceHandler(head, reduceWith(tail, data))
            break

        // never mind
        default : throw new Error(`${UNKNOWN_TYPE} in pipe [${collect(pipe)}]`)
    }
    //
    return { ...data, ...mapWith(result, pipe) }
},

// runs all funcs simultaneously
run = (funcs, data) => Promise.all( funcs.map( func => func(data) ) ),

// runs the pipeline(s) simultaneously for every argument
fork = (args, pipes, data) =>
    Promise.all( [].concat(args).map( runPipes(pipes, data) ) ),

runPipes = (pipes, data) => input =>
    pipes.map( runPipe(input, data) ),

runPipe = (input, state) => pipe => void
    pipe[FUNCNAME_EXECUTE](input, state),

//
isString         = value => typeof value === TYPE.String,
isFunc           = value => typeof value === TYPE.Function,
hasFunction      = list  => list.length && hasFuncOrIsEmpty(list),
hasFuncOrIsEmpty = list  => list.every( func => isFunc(func) ),
hasPipeline      = list  => list.every( obj => isFunc(obj[FUNCNAME_EXECUTE]) ),
collect          = list  => [].concat(list).map( i => i.name || i ).join(),
debug    = (label, data) => console.debug(`\n${label}\n`, data),

// convert array to object using desired mapping
transform  = (list, proc, def={}) =>
    list && list.length
        ? Object.fromEntries(list.map( proc ))
        : def,

mapWith    = (list, prop) =>
    transform( list, (v, i) => [ prop[i].name, v ] ),
reduceWith = (list, prop) =>
    transform( list, v => [ v.name, prop[v.name] ], prop )
