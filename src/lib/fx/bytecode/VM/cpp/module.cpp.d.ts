/// <reference path="@types/emscripten" />

import * as Bundle from "@lib/idl/bytecode";

interface WASMMemory extends Bundle.IMemory
{
    heap: number;
    size: number;
}

interface WASMBundleFactory
{
    new(name: string, data: WASMMemory): Bundle.IBundle;
    createUAV(name: string, elementSize: number, length: number, register: number): Bundle.IUAV;
    destroyUAV(uav: Bundle.IUAV): void;
}

interface Module extends EmscriptenModule {
  Bundle: WASMBundleFactory;
}

export interface IEMScriptModule { 
  (): Promise<Module>;
}

declare const loader: IEMScriptModule;
export default loader;