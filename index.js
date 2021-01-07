"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function(disp=console.error) {
    const $ppl = new Array(),
    register = name => function(...fn) { $ppl.push([ name, fn ]); return this },
    execute = (input, state={}) => $ppl.reduce( ($pipe, item) => $pipe
        .then( pipe => Array.isArray(pipe) && process(item, input, pipe, state))
        .catch( err => void disp({ item, input, err }) ), Promise.resolve([]) )
    //
    return { execute, ...transform(METHODS, name => [ name, register(name) ]) }
}
//
const METHODS = {
    run     ({ funcs, args })        { return pack(funcs, apply(args)) },
    restore ({ funcs, pipe, state }) { return pack(funcs, prop(state), pipe) },
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
pack = (lst, proc, coll=[]) => Promise.all(coll.concat(lst.map( proc ))),
apply = arg          => fnc => fnc.apply(this, arg),
prop  = (obj, arg)   => fnc => arg ? obj[fnc.name] = arg(fnc) : obj[fnc.name],
exec  = (state, arg) => ppl => arg.map( input => ppl.execute(input, state) )
