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
        .then( data => summary && data && trace('summary', data, traceHandler) )
})
//
const process = async (item, data, traceHandler) => {
    const [ head, ...tail ] = item = [].concat(item)
    let result, input
    //
    if (hasFunction(item)) result = await run(item, data)
    //
    else if (isFunction(head) && hasPipeline(tail))
        [input] = result = await run([ head ], data),
        split(input, tail, data)
    //
    else if (isString(head) && hasFuncOrIsEmpty(tail))
        trace(head, data, traceHandler, tail)
    //
    else throw new Error(UNKNOWN_TYPE)
    //
    return result ? { ...data, ...mapWith(result, item) } : data
},
//
run   = (funcs, data) => Promise.all(funcs.map( func => func(data) )),
split = (args, pipelines, data) => void [].concat(args).map( input =>
         pipelines.map( pipeline => pipeline.execute(input, data) )),
trace = (cmt, data, traceHandler, funcs=[]) => void traceHandler(
         `\n${cmt}\n`, funcs.length ? reduceWith(funcs, data) : data ),
//
isString           = val  => typeof val === TYPE_STRING,
isFunction         = val  => typeof val === TYPE_FUNCTION,
hasFunction        = list => list.length && hasFuncOrIsEmpty(list),
hasFuncOrIsEmpty   = list => list.every( func => isFunction(func)),
hasPipeline        = list => !list.some( obj => !obj[FUNCNAME_EXECUTE] ),
transform  = (list, proc) => Object.fromEntries(list.map( proc )),
mapWith    = (list, prop) => transform( list, (v, i) => [ [prop[i].name], v ] ),
reduceWith = (list, prop) => transform( list, v => [ v.name, prop[v.name ]] )
