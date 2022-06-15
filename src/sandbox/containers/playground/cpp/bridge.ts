import { IEmitter } from '../idl/IEmitter';
import loadPipelineWASM from './pipeline.cpp';
import * as Bytecode from '@lib/idl/bytecode';
import { BundleT } from '@lib/idl/bundles/FxBundle_generated';

interface WASMMemory extends Bytecode.IMemory
{
    heap: number; // in bytes 
    size: number; // in uint32 (byteSize = 4 x size)
}

const PipelineModule = await loadPipelineWASM();
window['PipelineModule'] = PipelineModule;
function transferU8ToU32Heap(module: EmscriptenModule, u8Array: Uint8Array): WASMMemory {
    const heap = module._malloc(u8Array.length * u8Array.BYTES_PER_ELEMENT);
    const size = u8Array.length >> 2;
    module.HEAPU8.set(u8Array, heap);
    return { heap, size };
}

function createFromBundle(content: Uint8Array): IEmitter
{
    let pipelineWasm = null;
    let mem = transferU8ToU32Heap(PipelineModule, content);
    try {
        pipelineWasm = PipelineModule.loadFromBundle(mem);
    } finally {
        PipelineModule._free(mem.heap);
    }  

    return pipelineWasm;
}


export function unload(emitter: IEmitter)
{
    PipelineModule.destroyEmitter(emitter);
}


export function load(data: Uint8Array | BundleT): IEmitter
{
    console.assert(data instanceof Uint8Array, "only packed bundle are supported");
    const emitter = createFromBundle(<Uint8Array>data);
    emitter.reset();
    return emitter;
}

export function memoryToU8Array(input: Bytecode.IMemory)
{
    const { heap, size } = input as WASMMemory;
    return PipelineModule.HEAPU8.subarray(heap, (heap + (size << 2)));
}


export function memoryToI32Array(input: Bytecode.IMemory): Int32Array
{
    const { heap, size } = <WASMMemory>input;
    console.assert(heap %4 == 0, "unsupported heap address!");
    return PipelineModule.HEAP32.subarray(heap >> 2, ((heap >> 2) + size));
}


export function memoryToF32Array(input: Bytecode.IMemory): Float32Array
{
    const { heap, size } = <WASMMemory>input;
    console.assert(heap %4 == 0, "unsupported heap address!");
    return PipelineModule.HEAPF32.subarray(heap >> 2, ((heap >> 2) + size));
}
