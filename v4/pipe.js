"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */
//

const { isArray, isObject } = require('util')
const Queue = require('./queue')

module.exports = class Pipe {
    get name() { return `<${this.constructor.name}>` }

    constructor(queue, options) {
        const opt  = isObject(options) ? options : {}
        this.queue = isArray(queue)    ? queue   : []

        this.errHandler    = opt.errHandler    || console.error
        this.traceHandler  = opt.traceHandler
        this.propNameInput = opt.propNameInput || 'execute'
        this.summary       = opt.summary       || false
        this.processInSync = opt.processInSync || false
    }

    execute(...args) {
        // creates a Queue to be executed in the context of this pipe
        return new Queue(this).execute(...args)
    }
}
