"use strict"
/* https://github.com/jcschmidig/mixed-pipeline/blob/master/readmev4.md */

module.exports = (...args) => Reflect.construct(require('./pipe'), args)
