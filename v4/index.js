"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
const FUNCNAME_EXECUTE = "execute",
      TYPE_FUNCTION    = "function",
      TYPE_STRING      = "string",
      UNKNOWN_TYPE     = "unknown queue type"
//
module.exports = (
    queue,
    //
    {   errHandler    = console.error,
        traceHandler  = console.debug,
        propNameInput = FUNCNAME_EXECUTE,
        summary       = false   } = {}
) =>
({
    [FUNCNAME_EXECUTE]: ($input, $state={}) => queue
        .reduce(
            (state, item) => state
                .then( state => state && process(
                    item, { ...state, [propNameInput]:$input },
                    traceHandler, propNameInput )
                )
                //
                .catch( error => void errHandler({ queue:item, error }) )
            //
            , Promise.resolve($state) )
        //
        .then( state => summary && !trace('summary', [], state, traceHandler) )
})
//
const process = async (item, state, traceHandler, propNameInput) => {
    const [ head, ...tail ] = item = [].concat(item)
    let result = []
    //
    switch (typeof head) {
        //
        case TYPE_FUNCTION:
            const [ input ] = result = await run([ head ], state)
            if (!tail.length ) break
            //
            if ( listOfFunc(tail) &&
                 result.push(...(await run(tail, state))) ) break
            //
            if ( listOfProp(tail, FUNCNAME_EXECUTE) &&
                 !split(input, tail, state) ) break
        //
        case TYPE_STRING:
            if ( listOfFuncOrEmpty(tail) &&
                 !trace(head, tail, state, traceHandler, propNameInput) ) break
        //
        default: throw new Error(UNKNOWN_TYPE)
    }
    //
    return { ...state, ...arrToProp(result, item) }
},
//
run = (funcs, state) => Promise.all(funcs.map( func => func(state) )),
//
split = (args, pipelines, state) => void args.map( input =>
    pipelines.map( pipeline => pipeline.execute(input, state) )),
//
trace = (cmt, funcs, state, traceHandler, propNameInput) => void traceHandler(
    `\n${cmt}\n`, funcs.length
    ? { [propNameInput]: state[propNameInput],
        ...transform(funcs, func => [ func.name, state[func.name] ]) }
    : state ),
//
transform  = (list, proc) => Object.fromEntries(list.map( proc )),
arrToProp  = (list, prop) => transform( list, (v, i) => [ [prop[i].name], v ] ),
listOfFunc         = list => list.length && listOfFuncOrEmpty(list),
listOfFuncOrEmpty  = list => list.every( func => typeof func === TYPE_FUNCTION),
listOfProp = (list, prop) => !list.some( obj => !obj[prop] )
