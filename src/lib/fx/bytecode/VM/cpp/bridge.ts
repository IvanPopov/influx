///////////////////////////////////
///////////////////////////////////
///////////////////////////////////

function transferU8ToU32Heap(module: EmscriptenModule, u8Array: Uint8Array): WASMMemory {
    const heap = module._malloc(u8Array.length * u8Array.BYTES_PER_ELEMENT);
    const size = u8Array.length >> 2;
    module.HEAPU8.set(u8Array, heap);
    return { heap, size };
}

function transferI32ToU32Heap(module: EmscriptenModule, i32Array: Int32Array): WASMMemory {
    const heap = module._malloc(i32Array.length * i32Array.BYTES_PER_ELEMENT);
    const size = i32Array.length;
    module.HEAP32.set(i32Array, heap);
    return { heap, size };
}


///////////////////////////////////
///////////////////////////////////
///////////////////////////////////

import loadBundleWASM from './module.cpp';
import * as Bytecode from '@lib/idl/bytecode';

type IBundle = Bytecode.IBundle;

const BundleModule = await loadBundleWASM();
const WASMBundle = BundleModule.Bundle;

export function make(name:string, code: Uint8Array): IBundle
{
    let bundleWasm: IBundle = null;
    let mem = transferU8ToU32Heap(BundleModule, code);
    try {
        bundleWasm = new BundleModule.Bundle(name, mem);
    } finally {
        BundleModule._free(mem.heap);
    }  

    return bundleWasm;
}

interface WASMMemory extends Bytecode.IMemory
{
    heap: number; // in bytes 
    size: number; // in uint32 (byteSize = 4 x size)
}


export function memoryToU8Array(input: Bytecode.IMemory)
{
    const { heap, size } = input as WASMMemory;
    return BundleModule.HEAPU8.subarray(heap, (heap + (size << 2)));
}


export function memoryToI32Array(input: Bytecode.IMemory): Int32Array
{
    const { heap, size } = <WASMMemory>input;
    console.assert(heap %4 == 0, "unsupported heap address!");
    return BundleModule.HEAP32.subarray(heap >> 2, ((heap >> 2) + size));
}


export function memoryToF32Array(input: Bytecode.IMemory): Float32Array
{
    const { heap, size } = <WASMMemory>input;
    console.assert(heap %4 == 0, "unsupported heap address!");
    return BundleModule.HEAPF32.subarray(heap >> 2, ((heap >> 2) + size));
}


export function createUAV(name: string, elementSize: number, length: number, register: number)
{
    return WASMBundle.createUAV(name, elementSize, length, register);
}


export function destroyUAV(uav: Bytecode.IUAV)
{
    WASMBundle.destroyUAV(uav);
}

// cleanup shared registers memory
export function debugResetRegisters()
{
    WASMBundle.resetRegisters();
}
