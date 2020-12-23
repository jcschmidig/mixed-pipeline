"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function($errHandler=console.error, $pipeline=[]) {
    const addToPipeline = method => function(...funcs)
        { $pipeline.push({ method, funcs }); return this }
    //
    const execute = ($input, $state=new Map()) => void $pipeline.reduce(
        async (pipe, item, index) => {
            try      { index = process(item, $input, await pipe, $state) }
            catch(e) { $errHandler({ ...item, input:$input, error:e }) }
            return index }, [])
    //
    return { execute, ...register(METHODS, addToPipeline) }
}
//
const METHODS = {
    run ({ funcs, args }) { return pack(funcs, fapply(args)) },
    runShadow (props)     { this.run(props) },
    //
    store ({ funcs, args, state })   { funcs.map( fmap(state, fapply(args)) ) },
    restore ({ funcs, pipe, state }) { return pack(funcs, fmap(state), pipe) },
    //
    split ({ funcs:ppl, pipe:[args], state }) { ppl.map( pexec(state, args) ) },
    trace ({ funcs:[cmt='>>> trace', out=debug], args }) { out(cmt, { args }) }
},
//
isBroken = pipe => !Array.isArray(pipe) || pipe.includes(null),
process = ({ method, funcs }, input, pipe, state) =>   isBroken(pipe) ||
    METHODS[method] ({ funcs, pipe, args:pipe.concat(input), state }) || pipe,
//
register = (obj, gen, r={}) => (Object.keys(obj).map( k => r[k] = gen(k) ), r),
pack = (obj, proc, coll=[]) => Promise.all(coll.concat(obj.map( proc ))),
fapply = args       => func => func.apply(this, args),
fmap = (state, arg) => func => state[arg?'set':'get'](func.name, arg&&arg(func)),
pexec = (state, args) => ppl => args.map( input => ppl.execute(input, state) ),
debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
