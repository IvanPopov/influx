import { IEmitter } from '../../../idl/emitter/IEmitter';
import loadWASM from './module.cpp';
import * as Bytecode from '@lib/idl/bytecode';
import { Bundle, BundleContent, BundleT } from '@lib/idl/bundles/FxBundle_generated';
import { ITechnique } from '@lib/idl/ITechnique';
import * as flatbuffers from 'flatbuffers';

interface WASMMemory extends Bytecode.IMemory {
    heap: number; // in bytes 
    size: number; // in uint32 (byteSize = 4 x size)
}

const Module = await loadWASM();

const isEmitter = tech => tech?.getType() === 'emitter';
const isMat = tech => tech?.getType() === 'material';

function transferU8ToHeap(module: EmscriptenModule, u8Array: Uint8Array): WASMMemory {
    const heap = module._malloc(u8Array.length * u8Array.BYTES_PER_ELEMENT);
    const size = u8Array.length >> 2;
    module.HEAPU8.set(u8Array, heap);
    return { heap, size };
}

/**
 * @deprecated
 */
function transferU32ToHeap(module: EmscriptenModule, u32Array: Uint32Array): WASMMemory {
    const heap = module._malloc(u32Array.length * u32Array.BYTES_PER_ELEMENT);
    const size = u32Array.length;
    module.HEAPU32.set(u32Array, heap);
    return { heap, size };
}

/**
 * @deprecated
 */
function transferF32ToHeap(module: EmscriptenModule, f32Array: Float32Array): WASMMemory {
    const heap = module._malloc(f32Array.length * f32Array.BYTES_PER_ELEMENT);
    const size = f32Array.length;
    module.HEAPF32.set(f32Array, heap);
    return { heap, size };
}


function createFromBundle(content: Uint8Array): ITechnique {
    let pipelineWasm = null;
    let mem = transferU8ToHeap(Module, content);
    try {
        pipelineWasm = Module.createFromBundle(mem);
    } finally {
        Module._free(mem.heap);
    }

    return pipelineWasm;
}


export function destroyTechnique(tech: ITechnique) {
    if (isEmitter(tech)) {
        Module.destroyEmitter(<IEmitter>tech);
    }
}

function decodeBundleData(data: Uint8Array | BundleT): BundleT {
    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        let fx = new BundleT();
        let buf = new flatbuffers.ByteBuffer(data);
        Bundle.getRootAsBundle(buf).unpackTo(fx);
        return fx;
    }

    return <BundleT>data;
}

function decodeBundleType(data: Uint8Array | BundleT): BundleContent {
    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        let buf = new flatbuffers.ByteBuffer(data);
        return Bundle.getRootAsBundle(buf).contentType();
    }

    return (<BundleT>data).contentType;
}

export function createTechnique(data: Uint8Array | BundleT): ITechnique {
    console.assert(data instanceof Uint8Array, "only packed bundle are supported");

    const type = decodeBundleType(data);

    if (type === BundleContent.PartBundle) {
        // ! cpp module supports only particles bundles for now !
        const tech = createFromBundle(<Uint8Array>data);
        (<IEmitter>tech).reset();
        return tech;
    }

    // fixme: remove dummy code
    return { getName() { return <string>decodeBundleData(data).name }, getType() { return 'material' }, getPassCount() { return 0 }, getPass(i) { return null }, };
}


export function copyTechnique(dst: ITechnique, src: ITechnique): boolean {
    if (isEmitter(dst) && isEmitter(src)) {
        return Module.copyEmitter(<IEmitter>dst, <IEmitter>src);
    }
    return false;
}


export function memoryToU8Array(input: Bytecode.IMemory) {
    const { heap, size } = input as WASMMemory;
    return Module.HEAPU8.subarray(heap, (heap + (size << 2)));
}


export function memoryToI32Array(input: Bytecode.IMemory): Int32Array {
    const { heap, size } = <WASMMemory>input;
    console.assert(heap % 4 == 0, "unsupported heap address!");
    return Module.HEAP32.subarray(heap >> 2, ((heap >> 2) + size));
}


export function memoryToF32Array(input: Bytecode.IMemory): Float32Array {
    const { heap, size } = <WASMMemory>input;
    console.assert(heap % 4 == 0, "unsupported heap address!");
    return Module.HEAPF32.subarray(heap >> 2, ((heap >> 2) + size));
}

/**
 * @deprecated
 */
export function u32ArrayToMemory(input: Uint32Array): Bytecode.IMemory {
    return transferU32ToHeap(Module, input);
}

/**
 * @deprecated
 */
export function f32ArrayToMemory(input: Float32Array): Bytecode.IMemory {
    return transferF32ToHeap(Module, input);
}

export function viewToMemory(input: ArrayBufferView): Bytecode.IMemory {
    return transferU8ToHeap(Module, new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
}