import { BundleT } from '@lib/idl/bundles/FxBundle_generated';
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
    console.log(`%c Technique runtime has been switched to "${(useWASM ? "WASM" : "JS")}".`, 'font-weight: bold; background: #6f0000; color: #fff');
}

export function create(data: Uint8Array | BundleT): ITechnique
{
   return Pipe().createTechnique(data);
}


export function destroy(tech: ITechnique): void
{
    Pipe().destroyTechnique(tech);
}


export function copy(dst: ITechnique, src: ITechnique): boolean
{
    return Pipe().copyTechnique(dst, src);
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
