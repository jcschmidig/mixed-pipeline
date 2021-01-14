"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
const FUNCNAME_EXECUTE = "execute"
const TYPE_FUNCTION = "function", TYPE_STRING = "string"
const ERROR_UNKNOWN = "unknown queue type"
//
module.exports = (
    queue,
    //
    { errHandler=console.error,
      traceHandler=console.debug,
      propNameInput='execute',
      summary=false } = {}
) =>
({
    [FUNCNAME_EXECUTE] (input, $state={}) {
        $state = queue.reduce(
            (state, item) => state
                .then( state => state && process(
                    item,
                    { ...state, [propNameInput]:input },
                    traceHandler,
                    propNameInput )
                )
                //
                .catch( error => void errHandler({ queue:item, error }) )
            //
            , Promise.resolve($state)
        )
        //
        summary && $state.then(
            state => trace('summary', [], state, traceHandler)
        )
    }
})
//
const process = async (item, state, traceHandler, propNameInput) => {
    const [ head, ...tail ] = [].concat(item)
    let result = []
    //
    switch (typeof head) {
        //
        case TYPE_FUNCTION:
            result.push(...(await run([ head ], state)))
            if (!tail.length) break
            //
            if (listOfFunc(tail))
                result.push(...(await run(tail, state))); break
            //
            if (listOfProp(tail, FUNCNAME_EXECUTE))
                split(result[0], tail, state); break
        //
        case TYPE_STRING:
            if (listOfFuncOrEmpty(tail))
                trace(head, tail, state, traceHandler, propNameInput); break
        //
        default:
            throw new Error(ERROR_UNKNOWN)
    }
    //
    return { ...state, ...arrToProp([ head, ...tail ], result) }
},
//
run = (funcs, state) => Promise.all(funcs.map( func => func(state) )),
//
split = (args, pipelines, state) => args.map( input =>
        pipelines.map( pipeline => pipeline.execute(input, state) )),
//
trace = (comment, funcs, state, traceHandler, propNameInput) => {
    if (funcs.length)
        funcs = transform(funcs, func => [ func.name, state[func.name] ]),
        state = { [propNameInput]: state[propNameInput], ...funcs }
    //
    traceHandler(`\n${comment}\n`, state, '\n')
},
//
transform = (list, proc) => Object.fromEntries(list.map( proc )),
arrToProp = (prop, list) => transform( list, (v, i) => [ [prop[i].name], v ] ),
listOfFunc = list => list.length && listOfFuncOrEmpty(list),
listOfFuncOrEmpty = list => list.every( func => typeof func === TYPE_FUNCTION),
listOfProp = (list, prop) => !list.some( obj => !obj[prop] )
