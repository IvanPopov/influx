import { EInstructionTypes, ICompileExprInstruction, IInstruction, ITypeInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { EPartFxPassGeometry, IPartFxInstruction, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";

import { CodeEmitter } from "./CodeEmitter";
import { assert } from "@lib/common";

export class FxEmitter extends CodeEmitter {

    private emitRoutineProperty(name: string, routine: ICompileExprInstruction) {
        this.emitKeyword(name);
        this.emitKeyword('=');
        this.emitSpace();
        this.emitCompile(routine);
        this.emitChar(';');
        this.emitNewline();
    }

    private emitStringProperty(name: string, id: string) {
        this.emitKeyword(name),
            this.emitKeyword('='),
            this.emitKeyword(id),
            this.emitChar(';'),
            this.emitNewline()
    }

    emitPartFxDecl(fx: IPartFxInstruction) {
        this.begin();
        {
            this.emitKeyword('partFx');
            fx.name && this.emitKeyword(fx.name);
            fx.semantic && this.emitSemantic(fx.semantic);
            fx.annotation && this.emitAnnotation(fx.annotation);
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                fx.capacity && this.emitStringProperty('Capacity', String(fx.capacity));

                fx.spawnRoutine && this.emitRoutineProperty('SpawnRoutine', fx.spawnRoutine);
                fx.initRoutine && this.emitRoutineProperty('InitRoutine', fx.initRoutine);
                fx.updateRoutine && this.emitRoutineProperty('UpdateRoutine', fx.updateRoutine);

                this.emitNewline();
                fx.passList.forEach((pass, i) => (this.emitPartFxPass(pass),
                    i !== fx.passList.length - 1 && this.emitNewline()));
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }


    emitPartFxPass(pass: IPartFxPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            pass.prerenderRoutine && this.emitRoutineProperty('PrerenderRoutine', pass.prerenderRoutine);
            pass.sorting && this.emitStringProperty('Sorting', String(pass.sorting));
            this.emitStringProperty('Geometry', EPartFxPassGeometry[pass.geometry].substr(2));
            pass.instanceCount !== 1 && this.emitStringProperty('InstanceCount', String(pass.instanceCount));

            super.emitPassBody(pass);
        }
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emit(instr: IInstruction): CodeEmitter {
        if (!instr) {
            return this;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_PartFxDeclInstruction:
                this.emitPartFxDecl(instr as IPartFxInstruction);
                break;
            case EInstructionTypes.k_PartFxPassInstruction:
                this.emitPartFxPass(instr as IPartFxPassInstruction);
                break;
            default:
                super.emit(instr)
        }

        return this;
    }


    // emnitPartFx(partFx: IPartFxInstruction) {
    //     this.begin();
    //     this.emitComment('ATTENTION: This file is autogenerated.\nDo not change it directly.');
    //     this.end();
    //     //partFx.particle
    // }
}

const UAV_NAME_PART_DATA = 'particles';
const UAV_NAME_PART_STATE = 'states';
const UAV_NAME_PART_DEAD_INDICES = 'deadIndices';

const UPDTAE_GROUP_SIZE = 256;

export class FxTranslator extends FxEmitter {
    protected usedUAVs: number = 0;

    // // particle's data type name
    // protected partName: string;

    emitParticleData(fx: IPartFxInstruction) {
        this.begin();
        {
            assert(fx.particle.isComplex());
            const { typeName } = this.resolveType(fx.particle);

            this.emitComment('The buffer contains user-defined particle data.');
            this.emitLine(`RWStructuredBuffer<${typeName}> ${UAV_NAME_PART_DATA}: register(u${this.usedUAVs++});`);

            this.emitComment('The buffer contains the state of the particles, alive or dead.');
            this.emitLine(`RWBuffer<uint> ${UAV_NAME_PART_STATE}: register(u${this.usedUAVs++});`);

            this.emitComment('The buffer contains indicies of dead particles.');
            this.emitLine(`RWStructuredBuffer<uint> ${UAV_NAME_PART_DEAD_INDICES}: register(u${this.usedUAVs++});`);
        }
        this.end();
    }


    emitInitShader(fx: IPartFxInstruction) {
        // const { typeName } = this.resolveType(fx.particle);
        // const updateFn = fx.updateRoutine.function;

        // this.begin();
        // {
        //     this.emitLine(`[numthreads(${UPDTAE_GROUP_SIZE}, 1, 1)]`);
        //     this.emitLine('void ParticlesUpdateShader(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID )');
        //     this.emitChar('{');
        //     this.push();
        //     {
        //         this.emitLine(`uint partId = DTid.x;`);
        //         this.emitLine(`bool alive = (bool)${UAV_NAME_PART_STATE}[partId];`);
        //         this.emitNewline();
        //         this.emitLine(`[branch]`);
        //         this.emitLine(`if(!alive) return;`);
        //         this.emitNewline();

        //         this.emitLine(`${typeName} part = ${UAV_NAME_PART_DATA}[partId];`);
        //         this.emitNewline();

        //         this.emitFunction(updateFn);
        //         this.emitLine(`[branch]`);
        //         this.emitLine(`if (!${updateFn.name}(part${updateFn.def.params.length > 1 ? ', partId' : ''}))`);
        //         this.emitChar('{');
        //         this.push();
        //         {
        //             this.emitComment('returning the particle index to the list of the dead');
        //             this.emitLine(`uint n = ${UAV_NAME_PART_DEAD_INDICES}.IncrementCounter();`);
        //             this.emitLine(`${UAV_NAME_PART_DEAD_INDICES}[n] = partId;`);
        //             this.emitNewline();

        //             this.emitComment('set particles\'s state as \'dead\'');
        //             this.emitLine(`${UAV_NAME_PART_STATE}[partId] = 0;`);
        //             this.emitLine('return;');
        //         }
        //         this.pop();
        //         this.emitChar('}');
        //         this.emitNewline();
        //         this.emitNewline();

        //         this.emitLine(`${UAV_NAME_PART_DATA}[partId] = part;`);
        //     }
        //     this.pop();
        //     this.emitChar('}');
        // }
        // this.end();
    }

    emitUpdateShader(fx: IPartFxInstruction) {
        const { typeName } = this.resolveType(fx.particle);
        const updateFn = fx.updateRoutine.function;

        this.begin();
        {
            this.emitLine(`[numthreads(${UPDTAE_GROUP_SIZE}, 1, 1)]`);
            this.emitLine('void ParticlesUpdateShader(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID )');
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint partId = DTid.x;`);
                this.emitLine(`bool alive = (bool)${UAV_NAME_PART_STATE}[partId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!alive) return;`);
                this.emitNewline();

                this.emitLine(`${typeName} part = ${UAV_NAME_PART_DATA}[partId];`);
                this.emitNewline();

                this.emitFunction(updateFn);
                this.emitLine(`[branch]`);
                this.emitLine(`if (!${updateFn.name}(part${updateFn.def.params.length > 1 ? ', partId' : ''}))`);
                this.emitChar('{');
                this.push();
                {
                    this.emitComment('returning the particle index to the list of the dead');
                    this.emitLine(`uint n = ${UAV_NAME_PART_DEAD_INDICES}.IncrementCounter();`);
                    this.emitLine(`${UAV_NAME_PART_DEAD_INDICES}[n] = partId;`);
                    this.emitNewline();

                    this.emitComment('set particles\'s state as \'dead\'');
                    this.emitLine(`${UAV_NAME_PART_STATE}[partId] = 0;`);
                    this.emitLine('return;');
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();
                this.emitNewline();

                this.emitLine(`${UAV_NAME_PART_DATA}[partId] = part;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();
    }

    emitPartFxDecl(fx: IPartFxInstruction) {
        this.emitParticleData(fx);
        this.emitUpdateShader(fx);
    }
}

export function translateFlat(fx: IPartFxInstruction): string {
    const emitter = new FxTranslator();
    emitter.emit(fx);
    return emitter.toString();
}

export function translate(instr: IInstruction): string {
    const emitter = new FxEmitter();
    emitter.emit(instr);
    return emitter.toString();
}

