"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */

const Data = require('./data')
const Matrix = require('./matrix')
const { emptyAllowed, ensureList, throwError, checkArray, checkSuccess, pExec,
        hasInstance, listToObject, ensureLAttr, hasFunction, pListExec,
        isInstance, timeUnit, ensureArray }
        = require('./util')
const { isString, isFunction, isObject } = require('util')
const { error, debug } = console
const [ SUCCESS, FAIL ] = [ true, false ]

module.exports = class {
    get data()       { return this._data.tuple }
    set data(data)   {
        if (!data || data._tuple) this._data = new Data(data)
        else this._data.tuple = [this.names, data]
    }

    get names()      { return this._names }
    set names(attr)  { this._names = ensureLAttr(attr, 'name') }

    get time()       { return process.hrtime(this._time) }
    startTimer()     { this._time = process.hrtime() }

    constructor(pipe) {
        isObject(pipe) || throwError('pipe should be an object')
        checkArray(pipe.pipeline).length || throwError('pipeline not found')

        this.pipe  = pipe
        this.trace = pipe.traceHandler || trace
        this.error = pipe.errHandler   || error
    }

    execute(...args) {
        return this.pipe.pipeline
            .reduce ( this.process.bind(this), this.init(args) )
            .then   ( this.onSuccess.bind(this) )
            .catch  ( this.onFail.bind(this) )
            .finally( this.calc.bind(this) )
    }

    async process(data, pipe) {
        const [ head, ...tail ] = pipe = ensureList(pipe)
        this.saveData(await data, pipe)

        return(
            hasFunction(pipe) ?
                pListExec(pipe, this.data) :

            isFunction(head) && hasInstance(tail, this.pipe) ?
                this.executePipe(head, tail) :

            isString(head) && hasFunction(tail, emptyAllowed) ?
                ensureArray(this.trace(head, reduce(tail, this.data))) :

            throwError('Unknown type')
        )
    }

    executePipe(func, pipes) {
        return pExec(func, this.data)
            .then(checkArray)
            .then(async args => Array.of(
                args,
                await this.matrix(pipes, args)
            ))
    }

    matrix(pipes, args) {
        const matrix = new Matrix(pipes, args)
        const procs  = matrix.run(this.pipe.execute, this._data)

        if (this.pipe.processInSync) return procs.then(checkSuccess)
    }

    init([input, state]) {
        this.pipe.measure && this.startTimer()
        this.saveData(state, this.pipe.propNameInput)

        return input
    }

    saveData(data, pipe) {
        this.data = data
        this.names = pipe
    }

    onSuccess(data) {
        this.pipe.summary && (
            this.saveData(data),
            this.trace('summary', this.data)
        )

        return SUCCESS
    }

    onFail({message}) {
        message &&
        this.error(generalErr(message, collect(this.names), this.pipe.name))

        return FAIL
    }

    calc() {
        if (!this.pipe.measure) return

        const time = timeUnit(this.time)
        debug(`executed in ${time} by ${this.pipe.name}`)
    }
}

const
collect = list =>
    list.map(elem => elem && elem.name || `"${elem.toString()}"`).join(', '),
reduce = (list, data) => list.length
    ?listToObject(list, ({name}) => [name, data[name]]) :data,
generalErr = (msg, names, pName='-') =>
    `Oops! ${msg} in pipe [ ${names} ] of ${pName}.\n`,
trace = (label, data) => void debug(`${label}\n`, data)
