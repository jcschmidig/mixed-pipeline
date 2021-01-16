"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const FUNCNAME_EXECUTE = "execute",
      TYPE_FUNCTION    = "function",
      TYPE_STRING      = "string",
      UNKNOWN_TYPE     = "unknown queue type"
//
module.exports = ( queue,
                   //
                   { errHandler    = console.error,
                     traceHandler  = console.debug,
                     propNameInput = FUNCNAME_EXECUTE,
                     summary       = false   } = {} ) =>
({
    [FUNCNAME_EXECUTE]: ($input, $state={}) => queue
        .reduce( (state, item) =>
            state.then(   data => data && process( item, data, traceHandler ))
                 .catch( error => void errHandler({ queue:item, error }) )
            //
            , Promise.resolve({ ...$state, [propNameInput]:$input }) )
        //
        .then( data => summary && trace('summary', [], data, traceHandler) )
})
//
const process = async (item, data, traceHandler, /*private*/ result) => {
    const [ head, ...tail ] = item = [].concat(item)
    //
    // <label>[, <func>, ...]
    if ( typeof head === TYPE_STRING && listOfFuncOrEmpty(tail) &&
         trace(head, tail, data, traceHandler) ) return data
    //
    // <func>[, <func> | <pipeline>, ...]
    if (typeof head === TYPE_FUNCTION) {
        const [ input ] = result = await run([ head ], data)
             // <func>
        if ( !tail.length ||
             //  or <func>, <func>[, ...]
             (listOfFunc(tail) && result.push(...(await run(tail, data)))) ||
             //  or <func>, <pipeline>[, ...]
             (listOfProp(tail, FUNCNAME_EXECUTE) && split(input, tail, data))
        ) return { ...data, ...map(result, item) }
    }
    // misconfigured item
    throw new Error(UNKNOWN_TYPE)
},
// <func>[, <func>, ...]
run = (funcs, data) => Promise.all(funcs.map( func => func(data) )),
// <func, <pipeline>[, ...]
split = (args, pipelines, data) => !![].concat(args).map( input =>
    pipelines.map( pipeline => pipeline.execute(input, data) )),
// <label>[, <func>, ...]
trace = (cmt, funcs, data, traceHandler) => !void traceHandler(
    `\n${cmt}\n`, funcs.length ? reduce(funcs, data) : data ),
//
transform  = (list, proc) => Object.fromEntries(list.map( proc )),
map        = (list, prop) => transform( list, (v, i) => [ [prop[i].name], v ] ),
reduce     = (list, prop) => transform( list, v => [ v.name, prop[v.name ]] ),
listOfFunc         = list => list.length && listOfFuncOrEmpty(list),
listOfFuncOrEmpty  = list => list.every( func => typeof func === TYPE_FUNCTION),
listOfProp = (list, prop) => !list.some( obj => !obj[prop] )
