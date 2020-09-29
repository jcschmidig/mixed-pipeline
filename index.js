"use strict"

const { error:cError, debug:cDebug} = console

module.exports = function(errorHandler=cError, trace=false) {
    const pipeline = [],

    actionPipe = (action, res, input) =>
        Promise.resolve(action(...res.concat(input))),
    run = ({ arg:pipes, res, input }) =>
        Promise.all(pipes.map( pipe => actionPipe(pipe, res, input) )),
    store = ({ arg:func, res, state, input }) =>
        (state.set(func.name, actionPipe(func, res, input)), res),
    restore = async ({ arg:name, res, state }) =>
        res.concat(await state.get(name)),
    split = ({ arg:pipe, res, state }) =>
        res.concat(res[0].map( arg => pipe.execute(arg, state))),
    tracing = args => trace && cDebug('>>> trace <<<\n', args) || true,
    ok = res => res && res.every(v => v !== null),

    execute = (input, state=new Map()) =>
        pipeline.reduce( (promise, { action, arg }) => promise
            .then( res =>
                tracing({ method:action, func:arg, input:res, plus:input }) &&
                ok(res) && action({ arg, res, state, input }) )
            .catch( error => errorHandler({ method:action, func:arg, input, error }) )
            , Promise.resolve([input]) )
    //
    const ppl = (action, arg) => pipeline.push({ action, arg })
    return {
        add: function(...pipes) { ppl(run, pipes); return this },
        store: function(pipe) { ppl(store, pipe); return this },
        restore: function({ name }) { ppl(restore, name); return this },
        split: function(pipe) { ppl(split, pipe); return this },
        execute
    }
}
