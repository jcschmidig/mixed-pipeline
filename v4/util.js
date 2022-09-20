"use strict"

const { isBoolean, isObject, isArray, isFunction, isUndefined,
        isNullOrUndefined } = require('util'),

emptyAllowed = true,

decomp = fn => (arg1, ...arg2) =>
    arg2.length ?fn(arg1, ...arg2) :(...arg) => fn(arg1, ...arg),

mergeAttr = decomp( (attr, entry) => entry[attr] ),

mergeListAttr = attr => list => list.map(mergeAttr(attr)),

has = (list, proc, allowEmpty)  =>
    checkArray(list).length>=+!ensureBoolean(allowEmpty) && list.every(proc),

ensureAttrFn = (attr, func) => val => func.call(null, val[attr]),

ensureBoolean = val => isBoolean(val) && val,

ensureAttrBoolean = attr => ensureAttrFn(attr, ensureBoolean),

ensureArray   = arr => isArray(arr) ?arr :Array(),

ensureObject  = obj => isObject(obj) ?obj :new Object(),

ensureList    = val => isNullOrUndefined(val) ?Array() :Array().concat(val),

ensureAttr    =  decomp( (attr, entry) => ({
    [attr]: isUndefined(entry[attr]) ?entry :entry[attr]
})),

ensureLAttr   = (list, attr) => ensureList(list).map(ensureAttr(attr)),

throwError    = msg => { throw Error(msg) },

hasFunction   = (list, aEmpty) => has(list, isFunction, aEmpty),

isInstance    = decomp( (_class, obj) => obj instanceof _class.constructor ),

hasInstance   = (list, _class, aEmpty) => has(list, isInstance(_class), aEmpty),

hasSuccess    = (list, aEmpty) => has(list, ensureBoolean, aEmpty),

listToObject  = (list, proc) => Object.fromEntries(list.map(proc)),

check = (cond, value, errMsg="") => cond
    ? (isNullOrUndefined(value) ?cond :value)
    : throwError(errMsg),

checkArray = arr => check(isArray(arr), arr, "Array expected"),

checkSuccess = (list, aEmpty) =>
    check(hasSuccess(list, aEmpty), null, "Process failed"),

checkFunction = func =>
    check(isFunction(func), func, `${func} should be a function`),

exec = decomp( (data, func) => func.call(null, data) ),
pExec = (func, data) => Promise.resolve(exec(data, func)),

listExec = (list, data) => checkArray(list).map(exec(data)),
pListExec = (...args) => Promise.all(listExec(...args)),

timeUnit = ([second, nanosecond], decimal=3) => {
    const units = Array.of( [1e9, 's'], [1e6, 'ms'], [1e3, 'μs'], [1e0, 'ns'] ),
          value = second * 1e9 + nanosecond,
          [ limit, bez ] = units.find( ([key]) => key < value )
    return `${(value/limit).toFixed(decimal)} ${bez}`
}

module.exports = {
    emptyAllowed,
    has,
    mergeListAttr,
    ensureBoolean,
    ensureAttrBoolean,
    ensureArray,
    ensureObject,
    ensureList,
    ensureAttr,
    ensureLAttr,
    throwError,
    check,
    checkArray,
    checkSuccess,
    checkFunction,
    exec,
    pExec,
    listExec,
    pListExec,
    hasFunction,
    isInstance,
    hasInstance,
    hasSuccess,
    listToObject,
    timeUnit
}
