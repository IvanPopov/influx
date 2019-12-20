import { assert } from "@lib/common";
import { IPartFxInstruction, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";

import { FxEmitter } from "./FxEmitter";

const uavParticles = 'uavParticles';
const uavParticlesComment = `The buffer contains user-defined particle data.`;

const uavStates = 'uavStates';
const uavStatesComment = `The buffer contains the state of the particles, Alive or dead.`;

const uavDeadIndices = 'uavDeadIndices';
const uavDeadIndicesComment = `The buffer contains indicies of dead particles.`;

const uavCreationRequests = 'uavCeatetionRequests';
const uavPrerendered = 'uavPrerendered';

// const UPDTAE_GROUP_SIZE = 256;
// const INIT_GROUP_SIZE = 64; // size of creation bunch

export interface IUavReflection {
    register: number;
    name: string;
    type: string;
    uavType: string;
    elementType: string;
};

export interface ICSShaderReflection {
    name: string;
    numthreads: number[];
    uavs: IUavReflection[];
}

export interface IFxReflection {
    CSParticlesInitRoutine: ICSShaderReflection;
    CSParticlesUpdateRoutine: ICSShaderReflection;
    CSParticlesPrerenderRoutines: ICSShaderReflection[];
    VSParticleShaders: string[];
    PSParticleShaders: string[];
}

export class FxTranslator extends FxEmitter {
    protected knownUAVs: IUavReflection[] = [];

    emitUav(type: string, name: string, comment?: string): IUavReflection {
        let register = this.knownUAVs.map(uav => uav.name).indexOf(name);
        if (register === -1) {
            this.begin();
            {
                register = this.knownUAVs.length;
                comment && this.emitComment(comment);
                this.emitLine(`${type} ${name}: register(u${register});`);

                const regexp = /^([\w]+)<([\w0-9_]+)>$/;
                const match = type.match(regexp);
                assert(match);

                const reflection: IUavReflection = {
                    name,
                    type,
                    uavType: match[1],
                    elementType: match[2],
                    register
                };

                this.knownUAVs.push(reflection);
            }
            this.end();
        }

        return this.knownUAVs[register];
    }

    emitInitShader(fx: IPartFxInstruction): ICSShaderReflection {
        const initFn = fx.initRoutine.function;

        const name = 'CSParticlesInitRoutine';
        const numthreads = [1, 1, 1];
        const uavs = [];

        const reflection: ICSShaderReflection = { name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint GroupId = Gid.x;`);
                this.emitLine(`uint ThreadId = GTid.x;`);
                uavs.push(this.emitUav(`RWBuffer<uint2>`, uavCreationRequests));
                this.emitLine(`uint nPart = ${uavCreationRequests}[GroupId].x;`);
                this.emitNewline();
                this.emitLine(`if (ThreadId >= nPart) return;`);
                this.emitNewline();
                uavs.push(this.emitUav(`RWStructuredBuffer<uint>`, uavDeadIndices, uavDeadIndicesComment));
                this.emitLine(`int n = (int)${uavDeadIndices}.DecrementCounter();`);
                this.emitComment(`a bit confusing way to check for particles running out`);
                this.emitLine(`if (n <= 0)`);
                this.emitNewline();
                this.emitChar('{');
                this.push();
                {
                    this.emitComment(`not very beautiful, but a cheap way not to`);
                    this.emitComment(`think about the correctness of this counter`);
                    this.emitLine(`${uavDeadIndices}.IncrementCounter();`);
                    this.emitLine('return;');
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();
                this.emitNewline();
                this.emitLine(`uint PartId = ${uavDeadIndices}[n];`);

                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, uavParticles, uavParticlesComment));
                this.emitLine(`${partType} Particle;`);
                this.emitFunction(initFn);
                this.emitLine(`${initFn.name}(Particle${initFn.def.params.length > 1 ? ', PartId' : ''});`);
                this.emitLine(`${uavParticles}[PartId] = Particle;`);
                this.emitComment('set particles\'s state as \'Alive\'');
                uavs.push(this.emitUav(`RWBuffer<uint>`, uavStates, uavStatesComment));
                this.emitLine(`${uavStates}[PartId] = 1;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }

    emitUpdateShader(fx: IPartFxInstruction): ICSShaderReflection {
        const updateFn = fx.updateRoutine.function;

        const name = 'CSParticlesUpdateRoutine';
        const numthreads = [1, 1, 1];
        const uavs = [];

        const reflection: ICSShaderReflection = { name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(`RWBuffer<uint>`, uavStates, uavStatesComment));
                this.emitLine(`bool Alive = (bool)${uavStates}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, uavParticles, uavParticlesComment));
                this.emitLine(`${partType} Particle = ${uavParticles}[PartId];`);
                this.emitNewline();

                this.emitFunction(updateFn);
                this.emitLine(`[branch]`);
                this.emitLine(`if (!${updateFn.name}(Particle${updateFn.def.params.length > 1 ? ', PartId' : ''}))`);
                this.emitChar('{');
                this.push();
                {
                    uavs.push(this.emitUav(`RWStructuredBuffer<uint>`, uavDeadIndices, uavDeadIndicesComment));
                    this.emitComment('returning the particle index to the list of the dead');
                    this.emitLine(`uint n = ${uavDeadIndices}.IncrementCounter();`);
                    this.emitLine(`${uavDeadIndices}[n] = PartId;`);
                    this.emitNewline();

                    this.emitComment('set particles\'s state as \'dead\'');
                    this.emitLine(`${uavStates}[PartId] = 0;`);
                    this.emitLine('return;');
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();
                this.emitNewline();

                this.emitLine(`${uavParticles}[PartId] = Particle;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }

    emitPrerenderShader(fx: IPartFxInstruction, pass: IPartFxPassInstruction, i: number): ICSShaderReflection {
        const prerenderFn = pass.prerenderRoutine.function;

        const name = `CSParticlesPrerenderShader${i}`;
        const numthreads = [1, 1, 1];
        const uavs = [];

        const reflection: ICSShaderReflection = { name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(`RWBuffer<uint>`, uavStates, uavStatesComment));
                this.emitLine(`bool Alive = (bool)${uavStates}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                this.emitFunction(prerenderFn);
                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, uavParticles, uavParticlesComment));
                this.emitLine(`${partType} Particle = ${uavParticles}[PartId];`);

                const { typeName: prerenderedType } = this.resolveType(prerenderFn.def.params[1].type);
                
                uavs.push(this.emitUav(`AppendStructuredBuffer<${prerenderedType}>`, `${uavPrerendered}${i}`));
                
                if (pass.instanceCount > 1) {
                    this.emitLine(`for(int InstanceId = 0; InstanceId < ${pass.instanceCount}; InstanceId++)`);
                    this.emitChar('{');
                    this.push();
                }
                
                {
                    this.emitLine(`${prerenderedType} Prerendered;`);
                    if (prerenderFn.def.params.length == 3) {
                        if (pass.instanceCount === 1) {
                            this.emitLine(`int InstanceId = 0;`);
                        }
                        this.emitLine(`${prerenderFn.name}(Particle, Prerendered, InstanceId);`);
                    } else {
                        this.emitLine(`${prerenderFn.name}(Particle, Prerendered);`);
                    }
                    this.emitLine(`${uavPrerendered}${i}.Append(Prerendered);`);
                }

                if (pass.instanceCount > 1) {
                    this.pop();
                    this.emitChar('}');
                    this.emitNewline();
                }

            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }

    emitPartFxDecl(fx: IPartFxInstruction): IFxReflection {
        const IFxReflection = {};

        const CSParticlesInitRoutine = fx.initRoutine && this.emitInitShader(fx);
        const CSParticlesUpdateRoutine = fx.updateRoutine && this.emitUpdateShader(fx);
        const CSParticlesPrerenderRoutines = [];
        const VSParticleShaders = [];
        const PSParticleShaders = [];

        fx.passList.forEach((pass, i) => {
            const { prerenderRoutine, vertexShader, pixelShader } = pass;

            if (prerenderRoutine) {
                CSParticlesPrerenderRoutines[i] = this.emitPrerenderShader(fx, pass, i);
            }

            if (vertexShader) {
                this.emitFunction(vertexShader);
                VSParticleShaders[i] = vertexShader.name;
            }

            if (pixelShader) {
                this.emitFunction(pixelShader);
                PSParticleShaders[i] = pixelShader.name;
            }
        });

        return {
            CSParticlesInitRoutine,
            CSParticlesUpdateRoutine,
            CSParticlesPrerenderRoutines,
            VSParticleShaders,
            PSParticleShaders
        };
    }
}

export function translateFlat(fx: IPartFxInstruction): string {
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    console.log(JSON.stringify(reflection, null, '\t'));
    return emitter.toString();
}
