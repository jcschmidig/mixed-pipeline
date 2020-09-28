"use strict"

module.exports = function(errorHandler=console.error) {
    const pipeline = []

    const execute = (input, $state=new Map()) => {
        const errorFound = res => res === undefined
        const pipeStopped = res => res.some(value => value === null)
        const actionPipe = (action, res) =>
            Promise.resolve(action(...res.concat(input)))
        //
        const actions = {
            store: ({ store }, res) =>
                ($state.set(store.name, actionPipe(store, res)), res),
            restore: async ({ restore }, res) =>
                res.concat(await $state.get(restore)),
            split: ({ split }, res) =>
                res.concat(res[0].map( arg => split.execute(arg, $state)))
        }
        const actionResult = (pipe, res) =>
            Object.entries(actions).reduce( (out, [name, action]) =>
                out || !!pipe[name] && action(pipe, res), false)
        //
        const runPipe = (pipes, res) => Promise.all(
            pipes.map( pipe => actionPipe(pipe, res) ))
        //
        //
        pipeline.reduce( (promise, pipe) => promise
            .then( (res, actRes) =>
                errorFound(res) || pipeStopped(res) ? undefined :
                (actRes = actionResult(pipe, res)) ? actRes :
                runPipe(pipe, res) )
            .catch( error => errorHandler({ pipe, error }) )
            , Promise.resolve([input])
        )
    }
    //
    const ppl = arg => pipeline.push(arg)
    return {
        add: function(...pipes) { ppl(pipes); return this },
        split: function(pipe) { ppl({ split: pipe }); return this },
        store: function(pipe) { ppl({ store: pipe }); return this },
        restore: function(pipe) { ppl({ restore: pipe.name }); return this },
        execute
    }
}
