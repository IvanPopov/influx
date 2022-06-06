import loadPipelineWASM from './pipeline.cpp';


interface WASMMemory
{
    heap: number; // in bytes 
    size: number; // in uint32 (byteSize = 4 x size)
}

const PipelineModule = await loadPipelineWASM();


type IPipeline = InstanceType<(Awaited<ReturnType<typeof loadPipelineWASM>>)['Pipeline']>;

export function make(content: Uint8Array): IPipeline
{
    let pipelineWasm = null;
    let mem = transferU8ToU32Heap(PipelineModule, content);
    try {
        pipelineWasm = new PipelineModule.Pipeline(mem);
    } finally {
        PipelineModule._free(mem.heap);
    }  
    
    return pipelineWasm;
}


function transferU8ToU32Heap(module: EmscriptenModule, u8Array: Uint8Array): WASMMemory {
    const heap = module._malloc(u8Array.length * u8Array.BYTES_PER_ELEMENT);
    const size = u8Array.length >> 2;
    module.HEAPU8.set(u8Array, heap);
    return { heap, size };
}
