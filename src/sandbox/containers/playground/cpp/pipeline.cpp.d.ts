/// <reference path="@types/emscripten" />

// import * as Bundle from "@lib/idl/bytecode";

interface WASMMemory
{
    heap: number;
    size: number;
}

interface IPipeline {
    
}

interface WASMPipelineFactory {
    new(data: WASMMemory): IPipeline;
}

interface Module extends EmscriptenModule {
    Pipeline: WASMPipelineFactory;
}

export interface IEMScriptModule {
    (): Promise<Module>;
}

declare const loader: IEMScriptModule;
export default loader;