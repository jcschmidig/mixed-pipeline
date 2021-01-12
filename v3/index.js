"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function(errHandler=console.error) {
    const $pipeline = [], $init = Promise.resolve([]),
    //
    register = name => function(...funcs)
        { $pipeline.push([ name, List.from(funcs) ]); return this },
    //
    execute = (input, state={}) => $pipeline.reduce( ($pipe, item) => $pipe
        .then( pipe => Array.isArray(pipe) && process(item, input, pipe, state))
        .catch( err => void errHandler({ item, input, err }) ), $init )
    //
    return { execute, ...transform(METHODS, name => [ name, register(name) ]) }
}
//
const METHODS = {
    run     ({ funcs, args })        { return funcs.pack( apply(args) ) },
    restore ({ funcs, pipe, state }) { return funcs.pack( prop(state), pipe ) },
    store   ({ funcs, args, state }) { funcs.map( prop(state, apply(args)) ) },
    split   ({ funcs, pipe, state }) { funcs.map( exec(state, pipe[0]) ) },
    trace   ({ funcs:[cmt], args })  { console.debug(`${cmt}\n`, args, '\n') },
    runShadow (options)              { this.run(options) }
},
//
process = ([name, funcs], input, pipe, state) => pipe.includes(null) ||
    METHODS[name] ({ funcs, pipe, args: pipe.concat(input), state }) || pipe,
//
transform = (obj, proc)     => Object.fromEntries(Object.keys(obj).map( proc )),
apply = arg          => fnc => fnc.apply(this, arg),
prop  = (obj, arg)   => fnc => arg ? obj[fnc.name] = arg(fnc) : obj[fnc.name],
exec  = (state, arg) => ppl => arg.map( input => ppl.execute(input, state) )
//
class List extends Array {
    pack (proc, coll=[]) { return Promise.all(coll.concat(this.map( proc ))) } }
