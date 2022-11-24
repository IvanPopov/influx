import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";

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

export interface ITechniquePassDesc
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

export interface ITechniquePass<DESC_T extends ITechniquePassDesc = ITechniquePassDesc> {
    getDesc(): DESC_T;
}


export interface ITechnique<PASS_T extends ITechniquePass = ITechniquePass> {
    getName(): string;
    getType(): 'emitter' | 'material';

    getPassCount(): number;
    getPass(i: number): PASS_T;
}
