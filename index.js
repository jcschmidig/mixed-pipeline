"use strict"
/* Usage: see https://github.com/jcschmidig/mixed-pipeline#readme */
//
module.exports = function( $errHandler = console.error ) {
    const $pipeline = new Array(),
    addToPipeline = method => function(...funcs)
        { $pipeline.push({ method, funcs }); return this },
    //
    execute = (input, state=new Map()) =>
        void $pipeline.reduce( async (pipe, item, index) => {
            try       { index = processItem(item, input, await pipe, state) }
            catch(e)  { $errHandler({ ...item, input, error:e }) }
            return index
        }, [] )
    //
    return { execute, ...register(METHODS, addToPipeline) }
}
//
const METHODS = {
    run ({ funcs, args }) { return concurrent(funcs, fapply(args)) },
    runShadow (props)     { this.run(props) },
    //
    store ({ funcs, args, state })
        { funcs.map( fset(state, fapply(args)) ) },
    async restore ({ funcs, pipe, state })
        { return pipe.concat( await concurrent(funcs, fget(state)) ) },
    //
    split ({ funcs:pipelines, pipe:[input], state })
        { pipelines.map( pexec(input, state) ) },
    trace ({ funcs:[comment='>>> trace', output=debug], args })
        { output(comment, { args }) }
},
//
processItem = ({ method, funcs }, input, pipe, state) =>
    isBroken(pipe)
        || METHODS[method] ({ funcs, pipe, args:pipe.concat(input), state })
        || pipe,
isBroken = pipe => !Array.isArray(pipe) || pipe.includes(null),
//
register = (obj, gen) => Object.keys(obj).reduce( (o, key) =>
    Object.defineProperty(o, key, { value: gen(key), enumerable: true }), {} ),
concurrent = (obj, processor) => Promise.all( obj.map( processor )),
fapply =       args  => func => func.apply(this, args),
fset = (state, farg) => func => state.set(func.name, farg(func)),
fget =  state        => func => state.get(func.name),
pexec = (args, state) => ppl => args.map( input => ppl.execute(input, state) ),
debug = (comment, arg) => console.debug(`${comment}\n`, arg, '\n')
