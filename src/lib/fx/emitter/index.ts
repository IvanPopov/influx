import { BundleT } from '@lib/idl/bundles/FxBundle_generated';
import { IEmitter } from '../../idl/emitter/IEmitter';
import * as Bytecode from '@lib/idl/bytecode';

import * as WASMPipe from "./cpp/bridge";
import * as TSPipe from "./ts/bridge";
import { isDef } from '@lib/common';

let useWASM = true;

function Pipe()
{
    return useWASM ? WASMPipe : TSPipe;
}

export function isWASM()
{
    return useWASM;
}

export function switchRuntime(runtime?: 'wasm' | 'js')
{
    useWASM = isDef(runtime) ? runtime === 'wasm' : !useWASM;
    console.log(`%c Emitter runtime has been switched to "${(useWASM ? "WASM" : "JS")}".`, 'font-weight: bold; background: #6f0000; color: #fff');
}

export function create(data: Uint8Array | BundleT): IEmitter
{
   return Pipe().createEmitter(data);
}


export function destroy(emitter: IEmitter): void
{
    Pipe().destroyEmitter(emitter);
}


export function copy(dst: IEmitter, src: IEmitter): boolean
{
    return Pipe().copyEmitter(dst, src);
}

//
//
//

export function memoryToU8Array(input: Bytecode.IMemory): Uint8Array
{
    return Pipe().memoryToU8Array(input);
}


export function memoryToI32Array(input: Bytecode.IMemory): Int32Array
{
    return Pipe().memoryToI32Array(input);
}


export function memoryToF32Array(input: Bytecode.IMemory): Float32Array
{
    return Pipe().memoryToF32Array(input);
}
