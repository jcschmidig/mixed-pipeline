"use strict"

Array.prototype.head = function() { return this[0] }

module.exports = function(errorHandler=console.error) {
    const pipeline = []

    const execute = (input, $state=new Map()) => {
        const checkedError = res => res === undefined
        const stoppedPipe = res => res.some(value => value === null)
        const actionPipe = (action, res) =>
            Promise.resolve(action(...res.concat(input)))
        //
        const actions = {
            store: ({ store }, res) =>
                ($state.set(store.name, actionPipe(store, res) ), res),
            restore: async ({ restore }, res) =>
                res.concat(await $state.get(restore)),
            dive: ({ dive }, [args]) =>
                args.map( arg => dive.execute(arg, $state))
        }
        const actionResult = (pipe, res) =>
            Object.entries(actions)
                .filter( ([name]) => !!pipe[name] )
                .map( ([, action]) => action(pipe, res) )
                .head()
        //
        const runPipe = (pipes, res) => Promise.all(
            pipes.map( pipe => actionPipe(pipe, res) ))
        //
        //
        return pipeline.reduce( (promise, pipe) => promise
            .then( (res, actRes) =>
                checkedError(res) || stoppedPipe(res) ? undefined :
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
        dive: function(pipe) { ppl({ dive: pipe }); return this },
        store: function(pipe) { ppl({ store: pipe }); return this },
        restore: function(pipe) { ppl({ restore: pipe.name }); return this },
        execute
    }
}
