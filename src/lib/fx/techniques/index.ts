import { Bundle, BundleContent, BundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as Bytecode from '@lib/idl/bytecode';

import * as WASMPipe from "./cpp/bridge";
import * as TSPipe from "./ts/bridge";
import { isDef } from '@lib/common';
import { ITechnique } from '@lib/idl/ITechnique';

/// <reference path="./webpack.d.ts" />

// check shell.js for more details
// electron hack to support option --disable-wasm
const forceNoWasm = () => (new URLSearchParams(window.location.search)).get('disable-wasm') === 'true';
let useWASM = WASM && !forceNoWasm();

function Pipe() {
    return useWASM ? WASMPipe : TSPipe;
}

export function isWASM() {
    return useWASM;
}

export function switchRuntime(runtime?: 'wasm' | 'js') {
    useWASM = isDef(runtime) ? runtime === 'wasm' : !useWASM;
    console.log(`%c Technique runtime has been switched to "${(useWASM ? "WASM" : "JS")}".`, 'font-weight: bold; background: #6f0000; color: #fff');
}

// hack
import * as flatbuffers from 'flatbuffers';
function HACK_IsMaterialBundle(data: Uint8Array | BundleT): boolean {
    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        let buf = new flatbuffers.ByteBuffer(data);
        return Bundle.getRootAsBundle(buf).contentType() === BundleContent.MatBundle;
    }

    return (<BundleT>data).contentType === BundleContent.MatBundle;
}
// end of hack

export function create(data: Uint8Array | BundleT): ITechnique {
    // hack:
    // cpp module doesn't support material bundles
    if (HACK_IsMaterialBundle(data) && isWASM()) {
        console.warn('material bundle was created using TS module while WASM is on.');
        return TSPipe.createTechnique(data);
    }
    // end of hack

    return Pipe().createTechnique(data);
}


export function destroy(tech: ITechnique): void {
    Pipe().destroyTechnique(tech);
}


export function copy(dst: ITechnique, src: ITechnique): boolean {
    return Pipe().copyTechnique(dst, src);
}

//
//
//

export function memoryToU8Array(input: Bytecode.IMemory): Uint8Array {
    return Pipe().memoryToU8Array(input);
}

export function memoryToI32Array(input: Bytecode.IMemory): Int32Array {
    return Pipe().memoryToI32Array(input);
}

export function memoryToF32Array(input: Bytecode.IMemory): Float32Array {
    return Pipe().memoryToF32Array(input);
}

/**
 * @deprecated
 */
export function u32ArrayToMemory(input: Uint32Array): Bytecode.IMemory {
    return Pipe().u32ArrayToMemory(input);
}

/**
 * @deprecated
 */
export function f32ArrayToMemory(input: Float32Array): Bytecode.IMemory {
    return Pipe().f32ArrayToMemory(input);
}

export function viewToMemory(input: ArrayBufferView): Bytecode.IMemory {
    return Pipe().viewToMemory(input);
}
