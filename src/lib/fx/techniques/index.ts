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
import { ITexture, ITextureDesc, ITrimesh, ITrimeshDesc } from '@lib/idl/emitter/IEmitter';
import { Bundle, BundleT } from '@lib/idl/bundles/auto/fx/bundle';
import { BundleContent } from '@lib/idl/bundles/auto/fx/bundle-content';

function HACK_GetBundleType(data: Uint8Array | BundleT): BundleContent {
        if (data instanceof Uint8Array) {
            let buf = new flatbuffers.ByteBuffer(data);
            return Bundle.getRootAsBundle(buf).contentType();
        }
        return (<BundleT>data).contentType;
}

// end of hack

export function createTechnique(data: Uint8Array | BundleT): ITechnique {
    // hack:
    // cpp module doesn't support material/technique11 bundles
    // so redirect them to TS only solution
    if (isWASM()) {
        if (HACK_GetBundleType(data) === BundleContent.MatBundle || HACK_GetBundleType(data) === BundleContent.Technique11Bundle) {
            console.warn(`${BundleContent[HACK_GetBundleType(data)]} bundle was created using TS module while WASM is on.`);
            return TSPipe.createTechnique(data);
        }
    }
    // end of hack

    return Pipe().createTechnique(data);
}


export function destroyTechnique(tech: ITechnique): void {
    Pipe().destroyTechnique(tech);
}


export function copyTechnique(dst: ITechnique, src: ITechnique): boolean {
    return Pipe().copyTechnique(dst, src);
}


export function createTexture(desc: ITextureDesc, initData: ArrayBufferView): ITexture {
    return Pipe().createTexture(desc, initData);
}

export function destroyTexture(texture: ITexture) {
    Pipe().destroyTexture(texture);
}

export function createTrimesh(desc: ITrimeshDesc, vertices: ArrayBufferView, 
    faces: ArrayBufferView, indicesAdj: ArrayBufferView, facesAdj: ArrayBufferView): ITrimesh {
    return Pipe().createTrimesh(desc, vertices, faces, indicesAdj, facesAdj);
}


export function destroyTrimesh(mesh: ITrimesh) {
    Pipe().destroyTrimesh(mesh);
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
 * NOTE: copy view to NEW memory if WASM bundle is used (!)
 * @returns New array containing input data.
 */
export function copyViewToMemory(input: ArrayBufferView): Bytecode.IMemory {
    return Pipe().copyViewToMemory(input);
}

export function releaseMemory(mem: Bytecode.IMemory) {
    Pipe().releaseMemory(mem);
}