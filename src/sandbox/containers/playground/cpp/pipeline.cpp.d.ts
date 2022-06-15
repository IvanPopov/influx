/// <reference path="@types/emscripten" />

import { IEmitter } from '../idl/IEmitter';

interface WASMMemory
{
    heap: number;
    size: number;
}


interface Module extends EmscriptenModule {
    loadFromBundle(data: WASMMemory): IEmitter;
    destroyEmitter(rawptr: IEmitter): void;
}

export interface IEMScriptModule {
    (): Promise<Module>;
}

declare const loader: IEMScriptModule;
export default loader;