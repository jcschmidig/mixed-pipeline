"use strict"

module.exports = pipeline

const { error:cError, debug:cDebug } = console,
doAction = (action, res, input) =>
    Promise.resolve(action(...res, input)),

run = ({ arg:pipes, res, input }) =>
    Promise.all(pipes.map( pipe => doAction(pipe, res, input) )),

store = ({ arg:funcs, res, input, state }) => (
    void funcs.map( func => state.set(func.name, doAction(func, res, input)) ),
    res ),

restore = ({ arg:funcs, res, state }) =>
    Promise.all(funcs.map( ({name}) => state.get(name) ))
           .then( actions => [ ...res, ...actions ] ),

split = ({ arg:pipe, res:[args], state }) =>
    args.map( arg => pipe.execute(arg, state) ),

doTrace = (trace, args) => trace && cDebug('>>> trace <<<\n', args),
pplIsOk = res => !(res === undefined || res === false || res.includes(null)),

doProcess = (trace, { method, arg }, input, res, state) =>
    pplIsOk(res) && (
        void doTrace(trace, { method, arg, input:[...res, input] }),
        method({ arg, res, input, state }) )

function pipeline(errHandler=cError, trace=false) {
    const pipeline = new Array(),
    pipeStart = Promise.resolve(new Array()),

    execute = (input, state=new Map()) => void pipeline.reduce(
        (pipe, process) => pipe
            .then( res => doProcess(trace, process, input, res, state) )
            .catch( err => void errHandler({ ...process, input, err }) )
        , pipeStart )
    //
    const ppl = (method, arg) => pipeline.push({ method, arg })
    return {
        add: function(...pipes) { ppl(run, pipes); return this },
        store: function(...pipes) { ppl(store, pipes); return this },
        restore: function(...pipes) { ppl(restore, pipes); return this },
        split: function(pipe) { ppl(split, pipe); return this },
        execute
    }
}
