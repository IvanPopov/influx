import * as Bytecode from '@lib/idl/bytecode';
import { fromBundleMemory, TSBundle } from '@lib/fx/bytecode/VM/ts/bundle';

export function make(name: string, code: Uint8Array): Bytecode.IBundle
{
    return new TSBundle(name, code);
}


export function memoryToU8Array(input: Bytecode.IMemory): Uint8Array
{
    const buffer = fromBundleMemory(input);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export function memoryToF32Array(input: Bytecode.IMemory): Float32Array
{
    const buffer = fromBundleMemory(input);
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length);
}

export function memoryToI32Array(input: Bytecode.IMemory): Int32Array
{
    return fromBundleMemory(input);
}


export function createUAV(name: string, elementSize: number, length: number, register: number)
{
    return TSBundle.createUAV(name, elementSize, length, register);
}

export function destroyUAV(uav: Bytecode.IUAV)
{
    // nothing todo
}

// cleanup shared registers memory
export function debugResetRegisters()
{
    TSBundle.resetRegisters();
}


