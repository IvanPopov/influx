import { TypeLayout } from "@lib/fx/bytecode/VM/native";

// contains all necessary unpacked data to load and play effect
export interface IFxBundleSignature {
    mode: string;
    version: string;
    commithash: string;
    branch: string;
    timestamp: string;
}

export type FxBundleType = 'part';

export interface IFxBundle {
    version: IFxBundleSignature;
    name: string;
    type: FxBundleType;
}

export interface IFxUAVBundle {
    name: string;
    slot: number;
    stride: number;
    type: IFxTypeLayout;
}

export interface IFxRoutineBundle {
    type: 'bc' | 'glsl';
    code: Uint8Array | string;
    resources?: { uavs: IFxUAVBundle[]; };
    numthreads?: number[];
}

export interface IFxGLSLAttribute
{
    size: number;
    offset: number;
    attrName: string;
}

export interface IFxRoutineGLSLBundle extends IFxRoutineBundle
{
    type: 'glsl';
    // vertex bundles also contain attribute description
    attributes?: IFxGLSLAttribute[];
}

export enum EPartFxSimRoutines {
    k_Reset,
    k_Spawn,
    k_Init,
    k_Update,
    k_Last
}

export enum EPartFxRenderRoutines {
    k_Prerender,
    k_Vertex,
    k_Pixel,
    k_Last
}

export interface IPartFxRenderPass {
    routines: IFxRoutineBundle[];
    geometry: string;           // template name
    sorting: boolean;
    instanceCount: number;
    stride: number;             // instance stride in 32bit (integers)
    instance: IFxTypeLayout;
}

export type IFxTypeLayout = TypeLayout;

export interface IPartFxBundle extends IFxBundle {
    capacity: number;   // maximum number of particles allowed (limited by user manually in the sandbox)

    simulationRoutines: IFxRoutineBundle[];
    renderPasses: IPartFxRenderPass[];
    particle: IFxTypeLayout;
}

