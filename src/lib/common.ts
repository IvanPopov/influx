import { isEqual } from "./bf/bf";

export let typeOf: (x: any) => string = (x: any): string => {
    const s: string = typeof x;

    if (s === 'object') {
        if (x) {
            if (x instanceof Array) {
                return 'array';
            } else if (x instanceof Object) {
                return s;
            }

            const sClassName: string = Object.prototype.toString.call(x);

            if (sClassName === '[object Window]') {
                return 'object';
            }

            if ((sClassName === '[object Array]' ||
                (typeof x.length) === 'number' &&
                (typeof x.splice) !== 'undefined' &&
                (typeof x.propertyIsEnumerable) !== 'undefined' &&
                !x.propertyIsEnumerable('splice')

            )) {
                return 'array';
            }

            if ((sClassName === '[object Function]' ||
                (typeof x.call) !== 'undefined' &&
                (typeof x.propertyIsEnumerable) !== 'undefined' &&
                !x.propertyIsEnumerable('call'))) {
                return 'function';
            }
        } else {
            return 'null';
        }
    } else if (s === 'function' && (typeof x.call) === 'undefined') {
        return 'object';
    }

    return s;
};

export let isDef = (x: any): boolean => x !== undefined;
export let isDefAndNotNull = (x: any): boolean => x != null;
export let isEmpty = (x: any): boolean => x.length === 0;
export let isNull = (x: any): boolean => x === null;
export let isBoolean = (x: any): boolean => typeof x === 'boolean';
export let isString = (x: any): boolean => typeof x === 'string';
export let isNumber = (x: any): boolean => typeof x === 'number';
export let isFloat = isNumber;
export let isInt = (x: any): boolean => isNumber(x) && (~~x === x);
export let isUint = (x: any): boolean => isInt(x) && x > 0;
export let isFunction = (x: any): boolean => typeOf(x) === 'function';
export let isObject = (x: any): boolean => {
    const T: string = typeOf(x);
    return T === 'object' || T === 'array' || T === 'function';
};
export let isArrayBuffer = (x: any): boolean => x instanceof ArrayBuffer;
export let isTypedArray = (x: any): boolean => x !== null && typeof x === 'object' && typeof x.byteOffset === 'number';
export let isBlob = (x: any): boolean => x instanceof Blob;
export let isArray = (x: any): boolean => typeOf(x) === 'array';
// export let assignIfDef = (val: any, def: any) => (isDef(val) ? val : def);
export let deepEqual = (a: Object, b: Object) => JSON.stringify(a) === JSON.stringify(b);


export type Nullable<T> = {[P in keyof T]: T[P] | null } | null;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
/** For ex: retrieve the properties of the child that the parent does not have. */
export type Diff<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>>;
export type NonFunctionDiff<T1, T2> = NonFunctionProperties<Diff<T1, T2>>;
export type PropertiesDiff<T1, T2> = Writeable<NonFunctionDiff<T1, T2>>;
export type MakeOptional<T> = { [P in keyof T]?: T[P]; };

export const assert = console.assert.bind(console);
export const verbose = console.log.bind(console);