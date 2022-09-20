"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const { ensureBoolean, ensureArray, ensureObject } = require('./util')
const Queue = require('./queue')

module.exports = class {
    get name() { return `<${this._name}>` }
    set name(value) { this._name = value || 'Pipe'}

    constructor(pipeline, options) {
        const opt     = ensureObject(options)
        this.pipeline = ensureArray(pipeline)

        this.traceHandler  = opt.traceHandler
        this.errHandler    = opt.errHandler
        this.propNameInput = opt.propNameInput || 'execute'
        this.summary       = ensureBoolean(opt.summary)
        this.processInSync = ensureBoolean(opt.processInSync)
        this.measure       = ensureBoolean(opt.measure)
        this.name          = opt.name
    }

    execute(...args) {
        return new Queue(Object.freeze(this)).execute(...args)
    }
}
