import * as Bundle from '@lib/idl/bytecode';
import { TSBundle, TSBundleMemory } from './bundle';

export function make(name: string, code: Uint8Array): Bundle.IBundle
{
    return new TSBundle(name, code);
}


export function memoryToU8Array(input: Bundle.IMemory)
{
    const { buffer } = input as TSBundleMemory;
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}


export function memoryToI32Array(input: Bundle.IMemory)
{
    const { buffer } = input as TSBundleMemory;
    return buffer;
}


export function createUAV(name: string, elementSize: number, length: number, register: number)
{
    return TSBundle.createUAV(name, elementSize, length, register);
}

export function destroyUAV(uav: Bundle.IUAV)
{
    // nothing todo
}

// cleanup shared registers memory
export function debugResetRegisters()
{
    TSBundle.resetRegisters();
}


