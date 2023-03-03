import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { ITechnique, ITechniqueRenderPass } from "./ITechnique";

export interface IAttribute {
    size: number;
    offset: number;
    name: string;
}


export enum EUsage {
    k_Vertex = 0x01,
    k_Pixel = 0x02,
    k_Compute = 0x04
};


export interface IConstanBufferField {
    name: string;
    semantic: string;
    size: number;
    padding: number;
    length: number;
}


export interface IConstantBuffer {
    slot: number;
    name: string;
    size: number;
    usage: number;
    fields: IConstanBufferField[];
}


/** @deprecated */
export interface ITechnique9PassDesc
{
    instanceName: string;
    instanceLayout: IAttribute[];
    stride: number; // number of float elements in the prerendered particle (src)

    // GLSL shader's sources
    vertexShader: string;
    pixelShader: string;

    renderStates: IMap<ERenderStateValues>;

    cbuffers: IConstantBuffer[];
}

/** @deprecated */
export interface ITechnique9RenderPass<DESC_T extends ITechnique9PassDesc = ITechnique9PassDesc> extends ITechniqueRenderPass {
    getDesc(): DESC_T;
}

/** @deprecated */
export interface ITechnique9<PASS_T extends ITechnique9RenderPass = ITechnique9RenderPass> extends ITechnique<PASS_T> {}
