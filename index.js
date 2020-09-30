"use strict"

const { error:cError, debug:cDebug} = console
module.exports = function(errHandler=cError, tracingActive=false) {
    const pipeline = [ Promise.resolve([]) ],

    actionPipe = (action, res, input) =>
        Promise.resolve(action(...res, input)),
    run = ({ func:pipes, res, input }) =>
        Promise.all(pipes.map( pipe => actionPipe(pipe, res, input) )),
    store = ({ func:{name}, func, res, input, state }) =>
        (state.set(name, actionPipe(func, res, input)), res),
    restore = ({ func:name, res, state }) =>
        state.get(name).then(action => [...res, action]),
    split = ({ func:pipe, res:[args], state }) =>
        args.map( arg => pipe.execute(arg, state)),
    trace = args => tracingActive && cDebug('>>> trace <<<\n', args),
    ok = res => res && res.every(val => val !== null),

    execute = (input, state=new Map()) =>
        pipeline.reduce( (promise, { method, func }) => promise
            .then( res => ok(res) && (
                trace({ method, func, input:[...res, input] }),
                method({ func, res, input, state }) ))
            .catch( err => { errHandler({ method, func, input, err }) }) )
    //
    const ppl = (method, func) => pipeline.push({ method, func })
    return {
        add: function(...pipes) { ppl(run, pipes); return this },
        store: function(pipe) { ppl(store, pipe); return this },
        restore: function({ name }) { ppl(restore, name); return this },
        split: function(pipe) { ppl(split, pipe); return this },
        execute
    }
}
