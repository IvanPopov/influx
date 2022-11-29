import { IMemory } from '@lib/idl/bytecode';
import { ITechnique, ITechniquePass, ITechniquePassDesc } from '@lib/idl/ITechnique';
import { Uniforms } from '@lib/idl/Uniforms';


export interface IEmitterPassDesc extends ITechniquePassDesc
{
    geometry: string;
    sorting: boolean;
}

export interface IEmitterPass extends ITechniquePass<IEmitterPassDesc> {
    getData(): IMemory;
    getNumRenderedParticles(): number;  // num alive particles multipled by the prerendered instance count
    serialize(): void;                  // fill render buffer with instance data, including sorting if needed
    // preparePrerender();                 // drop prerender resource counters
    prerender(uniforms: Uniforms);      // update materials data per instance
    dump(): void;
}


export interface IEmitter extends ITechnique<IEmitterPass> {
    getCapacity(): number;
    getNumParticles(): number;
    
    simulate(uniforms: Uniforms): void;
    prerender(uniforms: Uniforms): void;    // alias for all pass prerender ((pass of passes) pass.prerender())
    serialize(): void;                      // alias for all pass serialization ((pass of passes) pass.serialize())
    reset(): void;
    
    dump(): void;
}

