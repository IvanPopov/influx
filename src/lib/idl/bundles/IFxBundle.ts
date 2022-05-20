import { TypeLayout } from "@lib/fx/bytecode/VM/native";

export interface ISerializable <T extends string>
{
    struct: T;
}

export interface IUnion <T extends string> {
    type: T;
    union: {
        [key in T]: any; // any?
    }
}

// contains all necessary unpacked data to load and play effect
export interface IFxBundleSignature extends ISerializable<'signature'> {
    mode: string;
    version: string;
    commithash: string;
    branch: string;
    timestamp: string;
}


export interface IFxTypeLayout extends TypeLayout, ISerializable<'type-layout'> {

}


export interface IFxUAVBundle extends ISerializable<'uav'> {
    name: string;
    slot: number;
    stride: number;
    type: IFxTypeLayout;
}


export interface IFxRoutineBundle extends IUnion<'bc' | 'glsl'>, ISerializable<'routine'> {
    union: {
        bc: IFxRoutineBytecodeBundle;
        glsl: IFxRoutineGLSLBundle;
    }
}


export interface IFxGLSLAttribute extends ISerializable<'GLSL-attribute'>
{
    size: number;
    offset: number;
    attrName: string;
}

export interface IFxRoutineBytecodeBundleResources extends ISerializable<'bytecode-routine-resources'>
{
    uavs: IFxUAVBundle[];
}

export interface IFxRoutineBytecodeBundle extends ISerializable<'bytecode-routine'>
{
    code: Uint8Array;
    resources: IFxRoutineBytecodeBundleResources;
    numthreads: number[];
}

export interface IFxRoutineGLSLBundle extends ISerializable<'GLSL-routine'>
{
    code: string;
    // vertex bundles also contain attribute description
    attributes: IFxGLSLAttribute[];
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


export interface IPartFxRenderPass extends ISerializable<'part-fx-render-pass'> {
    routines: IFxRoutineBundle[];
    geometry: string;           // template name
    sorting: boolean;
    instanceCount: number;
    stride: number;             // instance stride in 32bit (integers)
    instance: IFxTypeLayout;
}


export interface IPartFxBundle extends ISerializable<'part-fx-bundle'> {
    capacity: number;   // maximum number of particles allowed (limited by user manually in the sandbox)
    simulationRoutines: IFxRoutineBundle[];
    renderPasses: IPartFxRenderPass[];
    particle: IFxTypeLayout;
}


export interface IFxBundleContent extends IUnion<'part'>, ISerializable<'bundle-content'>  {
    union: {
        part: IPartFxBundle
    };
}

export interface IFxBundle extends ISerializable<'bundle'> {
    name: string;
    signature: IFxBundleSignature;
    content: IFxBundleContent;
}

export function serializable<T extends string>(struct: T): ISerializable<T>
{
    return { struct };
}
