"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function( $errHandler = console.error ) {
    const $pipeline = new Array(),
    addToPipeline = method => function(...funcs)
        { $pipeline.push({ method, funcs }); return this },
    //
    execute = ($input, $state=new Map()) => void $pipeline.reduce(
        async (pipe, item, index) => {
            try      { index = process(item, $input, await pipe, $state) }
            catch(e) { $errHandler({ ...item, input:$input, error:e }) }
            return index }, [])
    //
    return { execute, ...register(METHODS, addToPipeline) }
}
//
const METHODS = {
    run ({ funcs, args }) { return concurrent(funcs, fapply(args)) },
    runShadow (props)     { this.run(props) },
    //
    store ({ funcs, args, state }) { funcs.map( fset(state, fapply(args)) ) },
    async restore ({ funcs, pipe, state })
        { return pipe.concat(await concurrent(funcs, fget(state))) },
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
concurrent = (obj, processor) => Promise.all(obj.map( processor )),
fapply =       args  => func => func.apply(this, args),
fset = (state, farg) => func => state.set(func.name, farg(func)),
fget =  state        => func => state.get(func.name),
pexec = (state, args) => ppl => args.map( input => ppl.execute(input, state) ),
debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
