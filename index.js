"use strict"

Array.prototype.clone = function() {
  return this.map(e => Array.isArray(e) ? e.clone() : e);
}
Array.prototype.head = function() { return this[0] }

module.exports = function(errorHandler=console.error) {
    const pipeline = []

    const execute = (input, $state=new Map()) => {
        const _pipeline = pipeline.clone()
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
            split: ({ split }, res, args=res.head()) =>
                res.concat(args.map( arg => split.execute(arg, $state)))
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
        _pipeline.reduce( (promise, pipe) => promise
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
        split: function(pipe) { ppl({ split: pipe }); return this },
        store: function(pipe) { ppl({ store: pipe }); return this },
        restore: function(pipe) { ppl({ restore: pipe.name }); return this },
        execute
    }
}
