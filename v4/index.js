"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//
const FUNCNAME_EXECUTE = "execute",
      TYPE             = { String: 'string', Function: 'function' },
      UNKNOWN_TYPE     = "unknown queue type"
//
module.exports = ( queue,
                   //
                   { errHandler    = console.error,
                     traceHandler  = debug,
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
        .then( data => summary && data && traceHandler('summary', data) )
})
//
const process = async (item, data, traceHandler) => {
    const [ head, ...tail ] = item = [].concat(item)
    let result, input
    //
    if (hasFunction(item)) result = await run(item, data)
    else if (is(head, TYPE.Function) && hasPipeline(tail))
        [input] = result = await run([ head ], data), split(input, tail, data)
    else if (is(head, TYPE.String) && hasFuncOrIsEmpty(tail))
        traceHandler(head, tail.length ? reduceWith(tail, data) : data)
    else throw new Error(UNKNOWN_TYPE)
    //
    return result ? { ...data, ...mapWith(result, item) } : data
},
//
run   = (funcs, data) => Promise.all(funcs.map( func => func(data) )),
split = (args, pipelines, data) => void [].concat(args).map( input =>
         pipelines.map( pipeline => pipeline[FUNCNAME_EXECUTE](input, data) )),
//
is        = (value, type) => typeof value === type,
hasFunction        = list => list.length && hasFuncOrIsEmpty(list),
hasFuncOrIsEmpty   = list => list.every( func => is(func, TYPE.Function)),
hasPipeline        = list => !list.some( obj => !obj[FUNCNAME_EXECUTE] ),
transform  = (list, proc) => Object.fromEntries(list.map( proc )),
mapWith    = (list, prop) => transform( list, (v, i) => [ [prop[i].name], v ] ),
reduceWith = (list, prop) => transform( list, v => [ v.name, prop[v.name ] ] ),
debug     = (label, data) => console.debug(`\n${label}\n`, data)
