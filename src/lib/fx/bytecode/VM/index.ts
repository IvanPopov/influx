import { isDef, isNull, isString } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode';
import { ISLDocument } from "@lib/idl/ISLDocument";
import { asNativeViaCDL } from "./native";

import * as WASMBundle from "./cpp/bridge";
import * as TSBundle from "./ts/bridge";
import { IBundle, IMemory, IUAV } from "@lib/idl/bytecode";

export { asNative, asNativeRaw, asNativeViaAST, asNativeViaCDL } from './native';

/////////////////////////////////////////////////////////////////////
/// Common API
/////////////////////////////////////////////////////////////////////

/// <reference path="./webpack.d.ts" />

// check shell.js for more details
// electron hack to support option --disable-wasm
const forceNoWasm = () => (new URLSearchParams(window.location.search)).get('disable-wasm') === 'true';

let useWASM = WASM && !forceNoWasm();

function VMBundle() {
    return (useWASM ? WASMBundle : TSBundle);
}


export function isWASM() {
    return useWASM;
}


export function switchRuntime(runtime?: 'wasm' | 'js') {
    useWASM = isDef(runtime) ? runtime === 'wasm' : !useWASM;
    console.log(`%c VM runtime has been switched to "${(useWASM ? "WASM" : "JS")}".`, 'font-weight: bold; background: #6f0000; color: #fff');
}


export function make(debugName: string, code: number[] | Uint8Array): IBundle {
    return VMBundle().make(debugName, new Uint8Array(code));
}

/**
 * Interpret memory as typed array.
 * NOTE: no copying occurs (!)
 * @returns Same data interpreted as typed array. 
 */
export function memoryToU8Array(input: IMemory): Uint8Array {
    return VMBundle().memoryToU8Array(input);
}

/**
 * Interpret memory as typed array.
 * NOTE: no copying occurs (!)
 * @returns Same data interpreted as typed array. 
 */
export function memoryToI32Array(input: IMemory): Int32Array {
    return VMBundle().memoryToI32Array(input);
}

/**
 * Interpret memory as typed array.
 * NOTE: no copying occurs (!)
 * @returns Same data interpreted as typed array. 
 */
export function memoryToF32Array(input: IMemory): Float32Array {
    return VMBundle().memoryToF32Array(input);
}

/**
 * NOTE: copy view to NEW memory (!)
 * @returns New array containing input data.
 */
export function copyViewToMemory(input: ArrayBufferView): IMemory {
    return VMBundle().copyViewToMemory(input);
}


export function releaseMemory(mem: IMemory) {
    VMBundle().releaseMemory(mem);
}


export function createUAV(name: string, elementSize: number, length: number, register: number) {
    return VMBundle().createUAV(name, elementSize, length, register);
}


export function destroyUAV(uav: IUAV) {
    VMBundle().destroyUAV(uav);
}


/////////////////////////////////////////////////////////////////////

function debugResetRegisters() {
    VMBundle().debugResetRegisters();
}

declare const MODE: string;

// TODO: use bundle inside
/** @deprecated */
export async function evaluate(code: Uint8Array): Promise<any>;
/** @deprecated */
export async function evaluate(expr: string, document: ISLDocument): Promise<any>;
/** @deprecated */
export async function evaluate(param: string | Uint8Array, param2?: ISLDocument): Promise<any> {
    if (MODE === 'development') {
        debugResetRegisters();
    }

    let code: Uint8Array;
    if (isString(arguments[0])) {
        const expr = <string>arguments[0];
        const slDocument = <ISLDocument>arguments[1];
        const { program } = await Bytecode.translateExpression(expr, slDocument);
        if (isNull(program)) {
            return null;
        }
        const { code, cdl } = program;
        const bundle = make("[evaluate]", code);
        return asNativeViaCDL(bundle.play(), cdl);
    } else {
        code = arguments[0];
    }

    const bundle = make("[evaluate]", code);
    return bundle.play();
}



