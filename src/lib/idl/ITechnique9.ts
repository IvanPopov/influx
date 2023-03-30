import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { IConstantBuffer, ITechnique, ITechniqueRenderPass } from "./ITechnique";

export interface IAttribute {
    size: number;
    offset: number;
    name: string;
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
