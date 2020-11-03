class extArray extends Array {
    constructor(...arg) {
        super(...arg)
    }
    //
    exec(name, ...args) {
        return this.find(item => item.name === name).apply(null, args)
    }

    toList(converter) {
        return this.process(
            (list, item) =>
                list.addFunction(converter.call(null, item), item.name)
        )
    }

    process(processor) {
        return this.reduce( processor, new extArray() )
    }

    concurrent(action) {
        return Promise.all( this.map( action ))
    }

    addFunction(value, name=value.name, enumerable=true) {
        return Object.defineProperty(this, name, { value, enumerable })
    }
    //
    static get [Symbol.species]() { return Array }
}

module.exports = function(...args) { return new extArray(...args) }
