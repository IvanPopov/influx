import { assert } from "@lib/common";
import { T_FLOAT, isFloatBasedType } from "@lib/fx/analisys/SystemScope";
import { IVariableDeclInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { EPartFxPassGeometry, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { FxEmitter } from "./FxEmitter";

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
    name: string;
    capacity: number;
    particle: string; // << particle type name
    CSParticlesSpawnRoutine: ICSShaderReflection;
    CSParticlesResetRoutine: ICSShaderReflection;
    CSParticlesInitRoutine: ICSShaderReflection;
    CSParticlesUpdateRoutine: ICSShaderReflection;

    passes: {
        instance: string;
        sorting: boolean;
        geometry: EPartFxPassGeometry;
        instanceCount: number;
        VSParticleShader: string;
        PSParticleShader: string;
        CSParticlesPrerenderRoutine: ICSShaderReflection;
    }[];
}

export class FxTranslator extends FxEmitter {
    static UAV_PARTICLES = 'uavParticles';
    static UAV_STATES = 'uavStates';
    static UAV_DEAD_INDICES = 'uavDeadIndices';
    static UAV_CREATION_REQUESTS = 'uavCreationRequests';
    static UAV_PRERENDERED = 'uavPrerendered';
    static UAV_SPAWN_DISPATCH_ARGUMENTS = 'uavSpawnDispatchArguments';

    private static UAV_PARTICLES_DESCRIPTION = `The buffer contains user-defined particle data.`;
    private static UAV_STATES_DESCRIPTION = `The buffer contains the state of the particles, Alive or dead.`;
    private static UAV_DEAD_INDICES_DESCRIPTION = `The buffer contains indicies of dead particles.`;
    private static UAV_CREATION_REQUESTS_DESCRIPTION = 'The buffer contatins information about the number and type of particles to be created';
    private static UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION = '[no description added :/]';

    private static SPAWN_OPERATOR_POLYFILL_NAME = '__spawn_op__';
    private static SPAWN_OPERATOR_TYPE = '__SPAWN_T__';


    protected knownUAVs: IUavReflection[] = [];
    protected knownSpawnCtors: IFunctionDeclInstruction[] = [];


    protected emitSpawnStmt(stmt: ISpawnStmtInstruction) {

        let ctor = this.knownSpawnCtors.find(ctor => ctor === stmt.init);

        if (!ctor) {
            ctor = stmt.init;
            this.knownSpawnCtors.push(ctor);
        }



        // super.emitSpawnStmt(stmt);
    }


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

    emitResetShader(fx: IPartFxInstruction): ICSShaderReflection {
        const name = 'CSParticlesResetRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const reflection: ICSShaderReflection = { name, numthreads, uavs };

        const capacity = fx.capacity;

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint tid = DTid.x;`);
                this.emitLine(`if (tid >= ${capacity}) return;`);

                uavs.push(this.emitUav(`RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_DEAD_INDICES}[tid] = tid;`);

                uavs.push(this.emitUav(`RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_STATES}[tid] = 0;`);

                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle;`);

                assert(fx.particle.isComplex());
                fx.particle.fields.forEach(({ name, type }: IVariableDeclInstruction) => {
                    assert(type.length >= 1);
                    let zero = isFloatBasedType(type) ? '0.f' : '0';
                    if (type.length === 1) {
                        this.emitLine(`Particle.${name} = ${zero};`);
                    } else {
                        this.emitLine(`Particle.${name} = ${type.name}(${Array(type.length).fill(zero).join(', ')});`);
                    }
                });

                this.emitLine(`${FxTranslator.UAV_PARTICLES}[tid] = Particle;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }


    // TOOD: sync groupSize with value used inside the emitInitShader();
    protected emitSpawnOperator(params: IVariableDeclInstruction[], groupSize: number = 64): IUavReflection[] {
        const uavs = <IUavReflection[]>[];

        //
        // emit 'spawn' operator implementation
        //

        // this.begin();
        // {
        //     this.emitLine(`struct ${FxTranslator.SPAWN_OPERATOR_TYPE}`);
        //     this.emitChar(`{`);
        //     this.push();
        //     {
        //         this.emitLine(`uint count;`);
        //         this.emitLine(`uint type;`);
        //         if (params.length) {
        //             // todo:
        //         }
        //     }
        //     this.pop();
        //     this.emitChar(`}`);
        //     this.emitChar(';');
        // }
        // this.end();

        this.begin();
        {
            this.emitLine(`void ${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}(uint nPart)`);
            this.emitChar('{');
            this.push();
            {
                uavs.push(this.emitUav(`RWStructuredBuffer<uint2>`, 
                    FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
                uavs.push(this.emitUav(`RWBuffer<uint>`, 
                    FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION));

                this.emitLine(`int nGroups = (int)ceil((float)nPart / ${groupSize}.f);`);
                this.emitLine(`for (int i = 0; i < nGroups; ++i)`);
                this.emitChar(`{`);
                this.push();
                {
                    this.emitLine(`uint RequestId;`);
                    this.emitLine(`// layout: [ uint GroupCountX, uint GroupCountY, uint GroupCountZ ]`);
                    this.emitLine(`InterlockedAdd(${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0], 1u, RequestId);`);
                    // params
                    const request = `${FxTranslator.UAV_CREATION_REQUESTS}[RequestId]`;
                    this.emitLine(`${request}.x = min(nPart, ${groupSize}u);`);
                    this.emitLine(`${request}.y = 0u;`);

                    params.forEach(param => {
                        let type = param.type;
                        let nfloat = 0;
                        if (type.isComplex()) {
                            assert(false, 'unsupported');
                        }

                        if (type.isArray()) {
                            let n = type.size / T_FLOAT.size;
                            for (let i = 0; i < n; ++i) {
                                this.emitLine(`${request}.data[${i + (nfloat++)}] = 0u;`);
                            }
                        }
                    });

                    this.emitLine(`nPart = nPart - ${groupSize}u;`);
                }
                this.pop();
                this.emitChar(`}`);
            }
            this.pop();
            this.emitChar('}');

        }
        this.end();

        return uavs;
    }


    emitSpawnShader(fx: IPartFxInstruction): ICSShaderReflection {
        const spawnFn = fx.spawnRoutine.function;
        const elapsedTime = fx.scope.findVariable('elapsedTime');

        const name = 'CSParticlesSpawnRoutine';
        const numthreads = [1, 1, 1];
        const uavs = [];



        const reflection = <ICSShaderReflection>{ name, numthreads, uavs };

        uavs.push(...this.emitSpawnOperator([]));

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`if (DTid.x != 0u) return;`);
                this.emitNewline();

                this.emitLine(`// usage of 4th element of ${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS} as temp value of number of particles`);
                this.emitFunction(spawnFn);
                this.emitGlobal(elapsedTime);

                this.emitLine(`float nPartAddFloat = asfloat(${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[4]) + (float)${spawnFn.name}() * elapsedTime;`);
                this.emitLine(`float nPartAdd = floor(nPartAddFloat);`);
                // TODO: replace with InterlockedExchange()

                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0] = 0u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[1] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[2] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[3] = asuint(nPartAddFloat - nPartAdd);`);
                // TODO: check the capacity
                // this.emitLine(`nPartAdd = min(nPartAdd, )`)
                this.emitLine(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}((uint)nPartAdd);`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }


    emitInitShader(fx: IPartFxInstruction): ICSShaderReflection {
        const initFn = fx.initRoutine.function;

        const name = 'CSParticlesInitRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const reflection = <ICSShaderReflection>{ name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint GroupId = Gid.x;`);
                this.emitLine(`uint ThreadId = GTid.x;`);
                // TODO: emit operator instead!
                uavs.push(this.emitUav(`RWStructuredBuffer<uint2>`, FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
                this.emitLine(`uint nPart = ${FxTranslator.UAV_CREATION_REQUESTS}[GroupId].x;`);
                this.emitNewline();
                this.emitLine(`if (ThreadId >= nPart) return;`);
                this.emitNewline();
                uavs.push(this.emitUav(`RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
                this.emitLine(`int n = (int)${FxTranslator.UAV_DEAD_INDICES}.DecrementCounter();`);
                this.emitComment(`a bit confusing way to check for particles running out`);
                this.emitLine(`if (n <= 0)`);
                this.emitChar('{');
                this.push();
                {
                    this.emitComment(`not very beautiful, but a cheap way not to`);
                    this.emitComment(`think about the correctness of this counter`);
                    this.emitLine(`${FxTranslator.UAV_DEAD_INDICES}.IncrementCounter();`);
                    this.emitLine('return;');
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();
                this.emitNewline();
                this.emitLine(`uint PartId = ${FxTranslator.UAV_DEAD_INDICES}[n];`);

                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle;`);
                this.emitFunction(initFn);
                this.emitLine(`${initFn.name}(Particle${initFn.def.params.length > 1 ? ', PartId' : ''});`);
                this.emitLine(`${FxTranslator.UAV_PARTICLES}[PartId] = Particle;`);
                this.emitComment('set particles\'s state as \'Alive\'');
                uavs.push(this.emitUav(`RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_STATES}[PartId] = 1;`);
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
        const numthreads = [64, 1, 1];
        const uavs = [];

        const reflection = <ICSShaderReflection>{ name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(`RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);
                this.emitNewline();

                this.emitFunction(updateFn);
                this.emitLine(`[branch]`);
                this.emitLine(`if (!${updateFn.name}(Particle${updateFn.def.params.length > 1 ? ', PartId' : ''}))`);
                this.emitChar('{');
                this.push();
                {
                    uavs.push(this.emitUav(`RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
                    this.emitComment('returning the particle index to the list of the dead');
                    this.emitLine(`uint n = ${FxTranslator.UAV_DEAD_INDICES}.IncrementCounter();`);
                    this.emitLine(`${FxTranslator.UAV_DEAD_INDICES}[n] = PartId;`);
                    this.emitNewline();

                    this.emitComment('set particles\'s state as \'dead\'');
                    this.emitLine(`${FxTranslator.UAV_STATES}[PartId] = 0;`);
                    this.emitLine('return;');
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();
                this.emitNewline();

                this.emitLine(`${FxTranslator.UAV_PARTICLES}[PartId] = Particle;`);
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
        const numthreads = [64, 1, 1];
        const uavs = [];

        const reflection = <ICSShaderReflection>{ name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(`RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                this.emitFunction(prerenderFn);
                const { typeName: partType } = this.resolveType(fx.particle);
                uavs.push(this.emitUav(`RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);

                const { typeName: prerenderedType } = this.resolveType(prerenderFn.def.params[1].type);

                uavs.push(this.emitUav(`AppendStructuredBuffer<${prerenderedType}>`, `${FxTranslator.UAV_PRERENDERED}${i}`));

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
                    this.emitLine(`${FxTranslator.UAV_PRERENDERED}${i}.Append(Prerendered);`);
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
        const { name, capacity } = fx;

        const CSParticlesSpawnRoutine = this.emitSpawnShader(fx);
        const CSParticlesResetRoutine = this.emitResetShader(fx);
        const CSParticlesInitRoutine = fx.initRoutine && this.emitInitShader(fx);
        const CSParticlesUpdateRoutine = fx.updateRoutine && this.emitUpdateShader(fx);

        const passes = fx.passList.map((pass, i) => {
            const { prerenderRoutine, vertexShader, pixelShader } = pass;
            let { sorting, geometry, instanceCount } = pass;
            let VSParticleShader: string = null;
            let PSParticleShader: string = null;
            let CSParticlesPrerenderRoutine: ICSShaderReflection = null;

            if (prerenderRoutine) {
                CSParticlesPrerenderRoutine = this.emitPrerenderShader(fx, pass, i);
            }

            if (vertexShader) {
                this.emitFunction(vertexShader);
                VSParticleShader = vertexShader.name;
            }

            if (pixelShader) {
                this.emitFunction(pixelShader);
                PSParticleShader = pixelShader.name;
            }

            const { typeName: instance } = this.resolveType(pass.particleInstance);

            return {
                instance,
                sorting,
                geometry,
                instanceCount,
                VSParticleShader,
                PSParticleShader,
                CSParticlesPrerenderRoutine
            };
        });

        const { typeName: particle } = this.resolveType(fx.particle);

        return {
            name,
            capacity,
            particle,
            passes,
            CSParticlesSpawnRoutine,
            CSParticlesResetRoutine,
            CSParticlesInitRoutine,
            CSParticlesUpdateRoutine
        };
    }
}

export function translateFlat(fx: IPartFxInstruction): string {
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    // console.log(JSON.stringify(reflection, null, '\t'));
    return emitter.toString();
}
