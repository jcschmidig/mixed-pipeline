"use strict"
const { mergeListAttr, checkArray, checkFunction } = require('./util')
const mergeValue = mergeListAttr('value')

module.exports = class {
    constructor(row, column) {
        this.row  = checkArray(row)
        this.col  = checkArray(column)
    }

    run(func, ...value) {
        this.iter = this.row.length * this.col.length
        return Promise
            .allSettled(Array.from(this.launch(checkFunction(func), value)))
            .then(mergeValue)
    }

    get obj() { return this.row[ ~~(this.iter / this.col.length) ] }
    get arg() { return this.col[    this.iter % this.col.length  ] }

    *launch (func, value) {
        while (this.iter--) yield func.call(this.obj, this.arg, ...value)
    }
}
