/// <reference path="@types/emscripten" />

import { IEmitter, ITexture, ITextureDesc, ITrimesh, ITrimeshDesc } from '../../../idl/emitter/IEmitter';

interface WASMMemory
{
    heap: number;
    size: number;
}


interface Module extends EmscriptenModule {
    createFromBundle(data: WASMMemory): IEmitter;
    destroyEmitter(ptr: IEmitter): void;
    copyEmitter(dst: IEmitter, src: IEmitter): boolean;
    createTexture(desc: ITextureDesc, initData: WASMMemory): ITexture;
    destroyTexture(ptr: ITexture): void;
    createTrimesh(desc: ITrimeshDesc, 
        vertices: WASMMemory, 
        faces: WASMMemory, 
        indicesAdj: WASMMemory, 
        adjacency: WASMMemory)
    : ITrimesh;
    destroyTrimesh(ptr: ITrimesh): void;
}

export interface IEMScriptModule {
    (): Promise<Module>;
}

declare const loader: IEMScriptModule;
export default loader;