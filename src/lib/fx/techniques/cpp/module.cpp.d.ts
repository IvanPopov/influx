/// <reference path="@types/emscripten" />

import { IEmitter } from '../../../idl/emitter/IEmitter';

interface WASMMemory
{
    heap: number;
    size: number;
}


interface Module extends EmscriptenModule {
    createFromBundle(data: WASMMemory): IEmitter;
    destroyEmitter(ptr: IEmitter): void;
    copyEmitter(dst: IEmitter, src: IEmitter): boolean;
}

export interface IEMScriptModule {
    (): Promise<Module>;
}

declare const loader: IEMScriptModule;
export default loader;