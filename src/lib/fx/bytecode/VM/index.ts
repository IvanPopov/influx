import { isDef, isNull, isString } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode';
import { ISLDocument } from "@lib/idl/ISLDocument";
import { asNativeViaCDL } from "./native";

import * as WASMBundle from "./cpp/bridge";
 import * as TSBundle from "./ts/bridge";
import * as Bundle from "@lib/idl/bytecode";

export { asNative, asNativeRaw, asNativeViaAST, asNativeViaCDL } from './native';

/////////////////////////////////////////////////////////////////////
/// Common API
/////////////////////////////////////////////////////////////////////

let useWASM = true;

function VMBundle()
{
    return (useWASM ? WASMBundle : TSBundle);
}

export function isWASM()
{
    return useWASM;
}

export function switchRuntime(runtime?: 'wasm' | 'js')
{
    useWASM = isDef(runtime) ? runtime === 'wasm' : !useWASM;
    console.log(`%c VM runtime has been switched to "${(useWASM ? "WASM" : "JS")}".`, 'font-weight: bold; background: #6f0000; color: #fff');
}

export function make(debugName: string, code: Uint8Array): Bundle.IBundle {
    return VMBundle().make(debugName, code);
}

export function memoryToU8Array(input: Bundle.IMemory): Uint8Array {
    return VMBundle().memoryToU8Array(input);
}

export function memoryToI32Array(input: Bundle.IMemory): Int32Array {
    return VMBundle().memoryToI32Array(input);
}

export function createUAV(name: string, elementSize: number, length: number, register: number) {
    return VMBundle().createUAV(name, elementSize, length, register);
}


export function destroyUAV(uav: Bundle.IUAV)
{
    VMBundle().destroyUAV(uav);
}

/////////////////////////////////////////////////////////////////////

function debugResetRegisters() {
    VMBundle().debugResetRegisters();
}

declare const MODE: string;

// TODO: use bundle inside
export async function evaluate(code: Uint8Array): Promise<any>;
export async function evaluate(expr: string, document: ISLDocument): Promise<any>;
export async function evaluate(param: string | Uint8Array, param2?: ISLDocument): Promise<any> {
    if (MODE === 'development') {
        debugResetRegisters();
    }

    let code: Uint8Array;
    if (isString(arguments[0])) {
        const expr = <string>arguments[0];
        const slDocument = <ISLDocument>arguments[1];
        const program = await Bytecode.translateExpression(expr, slDocument);
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



