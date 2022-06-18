import { BundleT } from '@lib/idl/bundles/FxBundle_generated';
import { IEmitter } from './idl/IEmitter';
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

export function load(data: Uint8Array | BundleT): IEmitter
{
   return Pipe().load(data);
}


export function unload(emitter: IEmitter): void
{
    Pipe().unload(emitter);
}


export function reskin(emitter: IEmitter, data: Uint8Array | BundleT): IEmitter
{    
    console.assert(!useWASM, "reskin is unsupported under wasm pipeline");
    return TSPipe.reskin(emitter, data);
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
