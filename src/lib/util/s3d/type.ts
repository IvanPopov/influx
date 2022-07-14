
export function isNull(x) { return x === null; }
export function isDef(x) { return x !== undefined; }
export function isDefAndNotNull(x) { return x != null; }
export function isString(x) { return typeof x === 'string'; }
export function isFunction(fn) { return typeof fn === "function"; }
export function isBoolean(x) { return x === !!x; }
export function isArray(x) { return typeof x === "object" && x instanceof Array; }
export function isObject(x) { return typeof x === "object" && x !== null && !isArray(x); }
export function isNumber(x) { return typeof x === "number"; }
export function isEmpty(x: any) {
    if (x == null) {
        return true;
    }

    if (typeof x !== "object") {
        return false;
    }

    for (let key in x) {
        if (x.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

export function clone (obj: any): any {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}