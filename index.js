"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function($errHandler=console.error, $ppl=[[]]) {
    const register = method => function(...funcs)
        { $ppl.push({ method, funcs }); return this },
    //
    execute = ($input, $state=new Map()) => $ppl.reduce( async (pipe, item) => {
        try      { pipe = process(item, $input, await pipe, $state) }
        catch(e) { pipe = void $errHandler({ ...item, input:$input, error:e }) }
        return     pipe } )
    //
    return { execute, ...transform(METHODS, name => [ name, register(name) ]) }
}
//
const METHODS = {
    run ({ funcs, args })            { return pack(funcs, apply(args)) },
    runShadow (props)                { this.run(props) },
    store ({ funcs, args, state })   { funcs.map( map(state, apply(args)) ) },
    restore ({ funcs, pipe, state }) { return pack(funcs, map(state), pipe) },
    //
    split ({ funcs:ppl, pipe:[args], state }) { ppl.map( exec(state, args) ) },
    trace ({ funcs:[cmt='>>> trace', out=debug], args }) { out(cmt, { args }) }
},
//
isBroken = pipe => !Array.isArray(pipe) || pipe.includes(null),
process = ({ method, funcs }, input, pipe, state) =>   isBroken(pipe) ||
    METHODS[method] ({ funcs, pipe, args:pipe.concat(input), state }) || pipe,
//
transform = (obj, proc)     => Object.fromEntries(Object.keys(obj).map( proc )),
pack = (lst, proc, coll=[]) => Promise.all(coll.concat(lst.map( proc ))),
apply = arg          => fnc => fnc.apply(this, arg),
map   = (m, arg)     => fnc => arg ? m.set(fnc.name, arg(fnc)) : m.get(fnc.name),
exec  = (state, arg) => ppl => arg.map( input => ppl.execute(input, state) ),
debug = (comment, arg)      => console.debug(`${comment}\n`, arg, '\n')
