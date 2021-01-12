"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function( queue,
    { errHandler=console.error,
      traceHandler=console.debug,
      summary=false } = {}
){
    //
    return {
        execute (input, $state={}) {
            $state = queue.reduce( (state, item) => state
                .then( state => state &&
                    process(item, { ...state, execute:input }, traceHandler) )
                //
                .catch( error => void errHandler({ queue:item, error }) )
                //
                , Promise.resolve($state) )
                //
            summary && $state.then( state =>
                trace('summary', [], state, traceHandler) )
        }
    }
}

const process = (item, state, traceHandler) => {
    const [ head, ...tail ] = [].concat(item)
    let result
    //
    switch (typeof head) {
        case 'string':
            result = trace(head, tail, state, traceHandler)
            break
        //
        case 'function':
            result = (tail.length && tail[0].execute)
                ? split(head, tail, state)
                : run([ head, ...tail ], state)
            break
        //
        default:
            throw new Error('unknown queue type')
    }
    //
    return result || state
},
//
run = async (funcs, state) => {
    for (let i=0, func; i<funcs.length; i++) func = funcs[i],
        state[func.name] = await func(state)
    //
    return state
},
//
split = async (func, pipelines, state) => {
    state = await run([func], state )
    //
    pipelines.map( pipeline =>
        [].concat(state[func.name]).map( input =>
            pipeline.execute(input, state) ))
    //
    return state
},
//
trace = (comment, funcs, state, traceHandler) => {
    state = funcs.length
        ? transform(funcs, func => [ func.name, state[func.name] ])
        : state
    //
    traceHandler(`\n${comment}\n`, state, '\n')
},
//
transform = (list, proc) => Object.fromEntries(list.map( proc ))
