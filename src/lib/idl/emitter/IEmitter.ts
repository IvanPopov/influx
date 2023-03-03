import { IMemory } from '@lib/idl/bytecode';
import { ITechnique9, ITechnique9PassDesc, ITechnique9RenderPass } from '@lib/idl/ITechnique9';
import { Uniforms } from '@lib/idl/Uniforms';


export interface IEmitterPassDesc extends ITechnique9PassDesc
{
    geometry: string;
    sorting: boolean;
}

export interface IEmitterPass extends ITechnique9RenderPass {
    getDesc(): IEmitterPassDesc;
    getData(): IMemory;
    getNumRenderedParticles(): number;  // num alive particles multipled by the prerendered instance count
    serialize(): void;                  // fill render buffer with instance data, including sorting if needed
    prerender(uniforms: Uniforms);      // update materials data per instance
    /** @deprecated */
    dump(): void;
}


export interface ITrimeshDesc {
    vertCount: number;
    faceCount: number;
}

// only R8G8B8A8 is supported for now
export interface ITextureDesc {
    width: number;
    height: number;
}


export interface ITexture {

}

export interface ITrimesh {

}

export interface IParticleDebugViewer {
    dump(): void;
    isDumpReady(): boolean;

    getParticleCount(): number;

    readParticleJSON(i: number): Object;
    readParticlesJSON(): Array<Object>;
}

export interface IEmitter extends ITechnique9<IEmitterPass> {
    getCapacity(): number;
    getNumParticles(): number;
    
    simulate(uniforms: Uniforms): void;
    prerender(uniforms: Uniforms): void;    // alias for all pass prerender ((pass of passes) pass.prerender())
    serialize(): void;                      // alias for all pass serialization ((pass of passes) pass.serialize())
    reset(): void;

    setTrimesh(name: string, trimesh: ITrimesh): void;
    setTexture(name: string, tex: ITexture): void;

    /** @deprecated */
    dump(): void;
    createDebugViewer(): IParticleDebugViewer;
}

/*
export interface IParticlesRenderQueue {
    getGeometry(): string;
    getTechnique(): ITechnique;
    getInstanceData(): IMemory;
    getNumRenderedParticles(): number;
} 

export interface IParticles {
    getCapacity(): number;
    getNumParticles(): number;
    
    reset(): void;
    simulate(): void;
    prerender(): void;    // alias for all pass prerender ((pass of passes) pass.prerender())
    serialize(): void;    // alias for all pass serialization ((pass of passes) pass.serialize())

    setTrimesh(name: string, trimesh: ITrimesh): void;
    setTexture(name: string, tex: ITexture): void;
    setUniform(name: string, value: ArrayBufferView): void;
    
    getRenderQueueNum(): number;
    getRenderQueue(): IParticlesRenderQueue;

    createDebugViewer(): IParticleDebugViewer;
}
*/
