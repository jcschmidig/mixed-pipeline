"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */

const Pipe = require('./pipe')

// creates a pipe with the given arguments to be executed
module.exports = (...args) => Reflect.construct(Pipe, args)
