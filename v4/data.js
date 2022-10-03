"use strict"
const { isUndefined } = require('util')
const { ensureList, ensureArray, isInstance } = require('./util')
const fCheckProp = ([prop]) => !isUndefined(prop)

module.exports = class {
    get tuple() {
        return Object.fromEntries(ensureArray(this._tuple).filter(fCheckProp))
    }
    set tuple([names, data]) {
        this._tuple = ensureArray(this._tuple).concat(
            ensureList(data).map((val, idx) => [names[idx].name, val])
        )
    }

    constructor(data) {
        this._tuple = isInstance(this, data) && data._tuple
    }
}
