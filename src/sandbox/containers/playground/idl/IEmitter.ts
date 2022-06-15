import { IMemory } from '@lib/idl/bytecode';
import { IMap } from '@lib/idl/IMap';
import { Vector3 } from 'three';


export interface IAttribute {
    size: number;
    offset: number;
    name: string;
}

// temp solution
export type Uniforms = IMap<number>;


export interface IEmitterPassDesc
{
    instanceLayout: IAttribute[];
    geometry: string;
    sorting: boolean;
    stride: number; // number of float elements in the prerendered particle (src)

    // GLSL shader's sources
    vertexShader: string;
    pixelShader: string;
}

export interface IEmitterPass {
    getDesc(): IEmitterPassDesc;
    getData(): IMemory;
    getNumRenderedParticles(): number; // num alive particles multipled by the prerendered instance count
    sort(pos: Vector3): void;
    prerender(uniforms: Uniforms);
    dump(): void;
}


export interface IEmitter {
    getName(): string;
    getCapacity(): number;
    getPassCount(): number;
    getPass(i: number): IEmitterPass;
    getNumParticles(): number;

    // public:
    tick(uniforms: Uniforms): void;
    reset(): void;
    dump(): void;
    destroy(): void;
}

