class extArray extends Array {
    //
    exec(name, ...args) {
        return this.find(item => item.name === name).apply(this, args)
    }

    toList(converter) {
        return this.process(
            (list, item) =>
                list.addFunction(converter.call(this, item), item.name)
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

module.exports = function(arr=[]) { return extArray.from(arr) }
