import { assert } from "@lib/common";
import { type } from "@lib/fx/analisys/helpers";
import { isBoolBasedType, isFloatBasedType, isIntBasedType, isUintBasedType, T_FLOAT, T_FLOAT4, T_INT, T_VOID } from "@lib/fx/analisys/SystemScope";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { EInstructionTypes, IFunctionDeclInstruction, IInitExprInstruction, ILiteralInstruction, ITechniqueInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { EPassDrawMode, IDrawStmtInstruction, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";
import { BoolInstruction } from "../analisys/instructions/BoolInstruction";
import { FloatInstruction } from "../analisys/instructions/FloatInstruction";
import { IntInstruction } from "../analisys/instructions/IntInstruction";
import { StringInstruction } from "../analisys/instructions/StringInstruction";
import { VariableTypeInstruction } from "../analisys/instructions/VariableTypeInstruction";

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

export interface IPassReflection {
    instance: string;
    VSParticleShader: string;
    PSParticleShader: string;

    renderStates: { [key: number/* ERenderStates */]: ERenderStateValues };
}

export interface IPartFxPassReflection extends IPassReflection {
    sorting: boolean;
    geometry: string;
    instanceCount: number;
    CSParticlesPrerenderRoutine: ICSShaderReflection;
    drawMode: number; // EPassDrawMode (0 - auto, 1 - manual)
}

export interface IPartFxReflection {
    name: string;
    capacity: number;
    particle: string; // << particle type name
    CSParticlesSpawnRoutine: ICSShaderReflection;
    CSParticlesResetRoutine: ICSShaderReflection;
    CSParticlesInitRoutine: ICSShaderReflection;
    CSParticlesUpdateRoutine: ICSShaderReflection;

    passes: IPartFxPassReflection[];
    controls: IUIControl[];
    presets: IPreset[];
}

export interface ITechniqueReflection {
    name: string;
    passes: IPassReflection[];
    controls: IUIControl[];
    presets: IPreset[];
}


export interface IDrawOpReflection {
    name: string;
    uavs: IUavReflection[];
}

interface IUIControlBase {
    UIName: string;
    UIType: string;

    name: string;
    value: Uint8Array;
}

export interface IUISpinner extends IUIControlBase {
    UIType: 'FloatSpinner' | 'Spinner';
    UIMin?: number;
    UIMax?: number;
    UIStep?: number;
}

export interface IUIVector extends IUIControlBase {
    UIType: 'Float3' | 'Color';
}

export interface IUIConstant extends IUIControlBase {
    UIType: 'Float' | 'Int' | 'Uint';
}

export type IUIControl = IUISpinner | IUIConstant | IUIVector;

export interface IPresetEntry { name: string; value: Uint8Array; }

export interface IPreset {
    name: string;
    desc: string;
    data: IPresetEntry[];
}

export class FxTranslator extends FxEmitter {
    static UAV_PARTICLES = 'uavParticles';
    static UAV_STATES = 'uavStates';
    static UAV_DEAD_INDICES = 'uavDeadIndices';
    static UAV_CREATION_REQUESTS = 'uavCreationRequests';
    static UAV_PRERENDERED = 'uavPrerendered';
    static UAV_SERIALS = 'uavSerials';
    static UAV_SPAWN_DISPATCH_ARGUMENTS = 'uavSpawnDispatchArguments';

    private static UAV_PARTICLES_DESCRIPTION = `The buffer contains user-defined particle data.`;
    private static UAV_STATES_DESCRIPTION = `The buffer contains the state of the particles, Alive or dead.`;
    private static UAV_DEAD_INDICES_DESCRIPTION = `The buffer contains indicies of dead particles.`;
    private static UAV_CREATION_REQUESTS_DESCRIPTION = 'The buffer contatins information about the number and type of particles to be created';
    private static UAV_SERIALS_DESCRIPTION = 'The buffer contains hashes are required for correct sorting during render buffer filling.';
    private static UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION = '[no description added :/]';

    private static SPAWN_OPERATOR_POLYFILL_NAME = '__spawn_op';
    private static SPAWN_OPERATOR_TYPE = '__SPAWN_T__';
    private static DRAW_OPERATOR_POLYFILL_NAME = '__draw_op';

    protected knownUAVs: IUavReflection[] = [];
    protected knownSpawnCtors: IFunctionDeclInstruction[] = [];
    protected knownDrawOps: IDrawOpReflection[] = [];

    protected tech: ITechniqueInstruction = null;
    protected controls: IUIControl[] = [];

    protected emitSpawnStmt(stmt: ISpawnStmtInstruction) {
        const fx = <IPartFxInstruction>this.tech;
        const init = stmt.scope.findFunction(stmt.name,
            [fx.particle, T_INT, ...stmt.args.map(a => a.type)]);

        let guid = this.knownSpawnCtors.findIndex(ctor => ctor === init) + 1;


        if (guid === 0) {
            this.knownSpawnCtors.push(init);
            guid = this.knownSpawnCtors.length;

            this.emitSpawnOperator(guid, init);
        }

        this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitKeyword(`${stmt.count}u`);
        if (stmt.args.length) {
            this.emitChar(',');
            this.emitExpressionList(stmt.args);
        }
        this.emitChar(')');
        this.emitChar(';');
        this.emitNewline();

        // super.emitSpawnStmt(stmt);
    }


    protected emitDrawStmt({ name, args }: IDrawStmtInstruction) {
        let fx = <IPartFxInstruction>this.tech;//<IPartFxInstruction>pass.parent;
        let pass = fx.passList.find(pass => pass.name == name);
        let i = fx.passList.indexOf(pass);
        if (this.knownDrawOps.map(r => r.name).indexOf(name) == -1) {
            let uavs = [];
            const prerenderFn = pass.prerenderRoutine.function;
            this.emitFunction(prerenderFn);
            this.emitPrerenderRoutune(pass, i, uavs);
            this.knownDrawOps.push({ name, uavs });
        }
        this.emitKeyword(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}`);
        this.emitChar(`(`);
        this.emitNoSpace();
        this.emitExpressionList(args);
        this.emitChar(`)`);
        this.emitChar(';');
        this.emitNewline();
    }


    protected emitUav(type: string, name: string, comment?: string): IUavReflection {
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

    protected emitResetShader(): ICSShaderReflection {
        const name = 'CSParticlesResetRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const reflection: ICSShaderReflection = { name, numthreads, uavs };
        const fx = <IPartFxInstruction>this.tech;
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
                    let zero = isFloatBasedType(type) ? '0.f' : isBoolBasedType(type) ? 'false' : '0';
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
    protected emitSpawnOperator(guid: number, ctor: IFunctionDeclInstruction, groupSize: number = 64): IUavReflection[] {
        const uavs = <IUavReflection[]>[];

        this.begin();
        {
            this.emitKeyword('void');
            this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitKeyword(`uint nPart`);
            if (ctor) {
                this.emitChar(',');
                this.emitParams(ctor.def.params.slice(2));
            }
            this.emitChar(')');
            this.emitChar('{');
            this.push();
            {
                uavs.push(this.emitUav(`RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
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
                    this.emitLine(`${request}.count = min(nPart, ${groupSize}u);`);
                    this.emitLine(`${request}.type = ${guid}u;`);

                    if (ctor) {
                        const params = ctor.def.params;
                        let nfloat = 0;
                        // skip first two arguments
                        params.slice(2).forEach(param => {
                            let type = param.type;
                            if (type.isComplex()) {
                                assert(false, 'unsupported', type.toCode());
                            }

                            let n = type.size / T_FLOAT.size;
                            for (let i = 0; i < n; ++i) {
                                this.emitLine(`${request}.payload[${Math.floor(nfloat / 4)}][${nfloat % 4}] = asfloat(${param.name}${type.isArray() ? `[${i % 4}]` : ``});`);
                                nfloat++;
                            }
                        });
                    }

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

    /*
        https://help.autodesk.com/view/MAXDEV/2023/ENU/?guid=shader_semantics_and_annotations
        https://help.autodesk.com/view/MAXDEV/2022/ENU/?guid=Max_Developer_Help_3ds_max_sdk_features_rendering_programming_hardware_shaders_shader_semantics_and_annotations_supported_hlsl_shader_annotation_html
    */

    emitVariableDecl(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        let ctrl: IUIControl = { UIType: null, UIName: null, name: null, value: null };

        if (src.annotation) {
            src.annotation.decls.forEach(decl => {
                switch (decl.name) {
                    case 'UIType':
                        const type = <StringInstruction>decl.initExpr.args[0];
                        ctrl.UIType = <typeof ctrl.UIType>type.value.split('"').join(''); // hack to remove quotes (should have been fixed during analyze stage)
                        console.assert(['FloatSpinner', 'Spinner', 'Color', 'Float3', 'Int', 'Uint', 'Float'].indexOf(ctrl.UIType) !== -1, 'invalid control type found');
                        break;
                    case 'UIName':
                        const name = <StringInstruction>decl.initExpr.args[0];
                        ctrl.UIName = name.value.split('"').join(''); // hack to remove quotes (should have been fixed during analyze stage)
                        break;
                    case 'UIMin': (ctrl as IUISpinner).UIMin = Number(decl.initExpr.args[0].toCode()); break;
                    case 'UIMax': (ctrl as IUISpinner).UIMax = Number(decl.initExpr.args[0].toCode()); break;
                    case 'UIStep': (ctrl as IUISpinner).UIStep = Number(decl.initExpr.args[0].toCode()); break;
                }
            });

            if (!ctrl.UIType) {
                switch (src.type.name) {
                    case 'float': ctrl.UIType = 'Float'; break;
                    case 'float3': ctrl.UIType = 'Float3'; break;
                    case 'int': ctrl.UIType = 'Int'; break;
                    case 'uint': ctrl.UIType = 'Uint'; break;
                }
            }

            let buffer = new ArrayBuffer(16); // todo: don't use fixed size
            let view1 = new DataView(buffer);
            let offset = 0;

            src.initExpr.args.forEach(arg => {
                const instr = arg.instructionType === EInstructionTypes.k_InitExpr
                    ? ((arg as IInitExprInstruction).args[0])
                    : (<ILiteralInstruction<number>>arg);
                switch (instr.instructionType) {
                    case EInstructionTypes.k_FloatExpr:
                        view1.setFloat32(offset, (instr as FloatInstruction).value, true);
                        offset += 4;
                        break;
                    case EInstructionTypes.k_IntExpr:
                        view1.setInt32(offset, (instr as IntInstruction).value, true);
                        offset += 4;
                        break;
                    case EInstructionTypes.k_BoolExpr:
                        view1.setInt32(offset, +(instr as BoolInstruction).value, true);
                        offset += 4;
                        break;
                }
            });

            ctrl.value = new Uint8Array(buffer);
            ctrl.name = src.id.name;

            // todo: validate controls
            if (ctrl.UIType) {
                this.controls.push(ctrl);

                // quick way to promote uniform qualifier to GLSL code
                (this.emitKeyword('uniform'), super.emitVariableDeclNoInit(src, rename));
                return;
            }
        }

        super.emitVariableDecl(src, rename);
    }

    protected emitSpawnShader(): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
        if (!fx.spawnRoutine) {
            return null;
        }

        const spawnFn = fx.spawnRoutine.function;
        const elapsedTime = fx.scope.findVariable('elapsedTime');

        const name = 'CSParticlesSpawnRoutine';
        const numthreads = [1, 1, 1];
        const uavs = [];



        const reflection = <ICSShaderReflection>{ name, numthreads, uavs };

        uavs.push(...this.emitSpawnOperator(0, null));

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
                if (elapsedTime) {
                    this.emitGlobal(elapsedTime);
                } else {
                    // IP: remove this hack
                    this.emitGlobalRaw('elapsedTime', 'uniform float elapsedTime');
                }

                this.emitLine(`float nPartAddFloat = asfloat(${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[3]) + (float)${spawnFn.name}() * elapsedTime;`);
                this.emitLine(`float nPartAdd = floor(nPartAddFloat);`);
                // TODO: replace with InterlockedExchange()

                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0] = 0u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[1] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[2] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[3] = asuint(nPartAddFloat - nPartAdd);`);
                // TODO: check the capacity
                // this.emitLine(`nPartAdd = min(nPartAdd, )`)
                this.emitLine(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}0__((uint)nPartAdd);`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }


    protected emitInitShader(): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
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
                uavs.push(this.emitUav(`RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`, FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
                this.emitLine(`uint nPart = ${FxTranslator.UAV_CREATION_REQUESTS}[GroupId].count;`);
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

                const request = `${FxTranslator.UAV_CREATION_REQUESTS}[GroupId]`;

                this.emitLine(`uint type = ${request}.type;`);
                this.emitLine(`if (type == 0u)`);
                this.emitChar('{');
                this.push();
                {
                    this.emitLine(`${initFn.name}(Particle${initFn.def.params.length > 1 ? ', PartId' : ''});`);
                }
                this.pop();
                this.emitChar('}');
                this.emitNewline();

                this.knownSpawnCtors.forEach((ctor, i) => {
                    this.emitFunction(ctor);
                    this.emitLine(`else if (type == ${i + 1}u)`);
                    this.emitChar('{');
                    this.push();
                    {
                        // TODO: move param unpacking to separate function
                        // unpack arguments
                        let nfloat = 0;
                        let params = ctor.def.params.slice(2);
                        params.forEach(param => {
                            this.emitVariableDecl(param);
                            this.emitChar(';');
                            this.emitNewline();

                            const type = param.type;
                            if (type.isComplex()) {
                                assert(false, 'unsupported', type.toCode());
                            }

                            let interpreter = 'asfloat';
                            if (isFloatBasedType(type)) { interpreter = 'asfloat'; }
                            if (isIntBasedType(type)) { interpreter = 'asint'; }
                            if (isUintBasedType(type)) { interpreter = 'asuint'; }

                            let n = type.size / T_FLOAT.size;
                            for (let i = 0; i < n; ++i) {
                                this.emitLine(`${param.name}${type.isArray() ? `[${i % 4}]` : ``} = ${interpreter}(${request}.payload[${Math.floor(nfloat / 4)}][${nfloat % 4}]);`);
                                nfloat++;
                            }


                            this.emitNewline();
                        });
                        this.emitLine(`${ctor.name}(Particle, PartId, ${params.map(param => param.name).join(', ')});`);
                    }
                    this.pop();
                    this.emitChar('}');
                    this.emitNewline();
                });
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

    protected emitUpdateShader(): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
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

        uavs.push(...this.knownDrawOps.map(r => r.uavs).flat());

        // hack
        uavs.push(this.emitUav(`RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
            FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
        uavs.push(this.emitUav(`RWBuffer<uint>`,
            FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION));


        return reflection;
    }

    protected emitPrerenderRoutune(pass: IPartFxPassInstruction, i: number, uavs: IUavReflection[]) {
        const fx = <IPartFxInstruction>this.tech;
        const prerenderFn = pass.prerenderRoutine.function;
        const { typeName: prerenderedType } = this.resolveType(prerenderFn.def.params[1].type);
        const { typeName: partType } = this.resolveType(fx.particle);
        this.begin();
        {
            this.emitLine(`void ${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}(${partType} Particle)`);
            this.emitChar('{');
            this.push();

            /*
                void __draw_op0(Part Particle)
                {
                    uint PrerenderId = uavPrerendered0.IncrementCounter();
                    uint SerialId = uavSerials0.IncrementCounter();
                    DefaultShaderInput Prerendered;
                    int SortIndex = prerender(Particle, Prerendered);
                    uavSerials0[SerialId] = int2(SortIndex, PrerenderId);
                    uavPrerendered0[PrerenderId] = Prerendered;
                }

                void __draw_op0(Part Particle)
                {
                    uint PrerenderId = uavPrerendered0.IncrementCounter();
                    uint SerialId = uavSerials0.IncrementCounter();
                    for (int InstanceId = 0; InstanceId < 5; ++ InstanceId) {
                        DefaultShaderInput Prerendered;
                        int SortIndex = prerender(Particle, Prerendered, InstanceId);
                        if (InstanceId == 0) {
                            uavSerials0[SerialId] = int2(SortIndex, PrerenderId);
                        }
                        uavPrerendered0[PrerenderId * 5 + InstanceId] = Prerendered;
                    }
                }
            */

            {
                uavs.push(this.emitUav(`RWStructuredBuffer<${prerenderedType}>`, `${FxTranslator.UAV_PRERENDERED}${i}`));

                if (pass.sorting) {
                    uavs.push(this.emitUav(`RWStructuredBuffer<int2>`, `${FxTranslator.UAV_SERIALS}${i}`, FxTranslator.UAV_SERIALS_DESCRIPTION));
                }

                this.emitLine(`uint PrerenderId = ${FxTranslator.UAV_PRERENDERED}${i}.IncrementCounter();`);
                if (pass.sorting) {
                    this.emitLine(`uint SerialId = ${FxTranslator.UAV_SERIALS}${i}.IncrementCounter();`);
                }

                if (pass.instanceCount > 1) {
                    this.emitLine(`for(int InstanceId = 0; InstanceId < ${pass.instanceCount}; InstanceId++)`);
                    this.emitChar('{');
                    this.push();
                }
                {

                    this.emitLine(`${prerenderedType} Prerendered;`);

                    const inputIndex = prerenderFn.def.params.findIndex(p => p.type.name === prerenderedType);
                    const partndex = prerenderFn.def.params.findIndex(p => p.type.name === partType);
                    const insidIndex = prerenderFn.def.params.findIndex(p => p.type.name === T_INT.name); // first int arg index
                    const args = [];
                    args[inputIndex] = `Prerendered`;
                    args[partndex] = `Particle`;

                    if (insidIndex !== -1) {
                        args[insidIndex] = `InstanceId`;
                    }

                    if (type.equals(prerenderFn.def.returnType, T_VOID)) {
                        this.emitLine(`int SortIndex = 0;`);
                        this.emitLine(`${prerenderFn.name}(${args.join(', ')});`);
                    }
                    else {
                        this.emitLine(`int SortIndex = ${prerenderFn.name}(${args.join(', ')});`);
                    }

                    if (pass.sorting) {
                        if (pass.instanceCount > 1) {
                            this.emitLine(`if (InstanceId == 0)`);
                            this.push();
                            this.emitLine(`${FxTranslator.UAV_SERIALS}${i}[SerialId] = int2(SortIndex, PrerenderId);`);
                            this.pop();
                        } else {
                            this.emitLine(`${FxTranslator.UAV_SERIALS}${i}[SerialId] = int2(SortIndex, PrerenderId);`);
                        }
                    }

                    if (pass.instanceCount > 1) {
                        this.emitLine(`${FxTranslator.UAV_PRERENDERED}${i}[PrerenderId * ${pass.instanceCount} + InstanceId] = Prerendered;`);
                    }
                    else {
                        this.emitLine(`${FxTranslator.UAV_PRERENDERED}${i}[PrerenderId] = Prerendered;`);
                    }

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
    }

    protected emitPrerenderShader(pass: IPartFxPassInstruction, i: number): ICSShaderReflection {
        const prerenderFn = pass.prerenderRoutine.function;

        const name = `CSParticlesPrerenderShader${i}`;
        const numthreads = [64, 1, 1];
        const uavs = [];
        const fx = <IPartFxInstruction>this.tech;

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

                this.emitPrerenderRoutune(pass, i, uavs);
                this.emitLine(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}(Particle);`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        return reflection;
    }

    protected emitSpawnOpContainer() {
        const payloadSize = this.knownSpawnCtors.map(
            // slice 1 or 2 depending on necessity of partID
            ctor => ctor.def.params.slice(2).map(param => param.type.size).reduce((size, summ) => summ + size, 0))
            .reduce((size, summ) => summ + size, 0);

        const alignment = T_FLOAT4.size;
        const numF4 = Math.ceil(payloadSize / alignment);

        this.begin();
        {
            this.emitLine(`struct ${FxTranslator.SPAWN_OPERATOR_TYPE}`);
            this.emitChar(`{`);
            this.push();
            {
                this.emitLine(`uint count;`);
                this.emitLine(`uint type;`);

                // this.emitLine(`uint _pad[2];`);
                // emit padding?

                if (numF4 > 0) {
                    this.emitNewline();
                    this.emitLine(`float4 payload[${numF4}];`);
                }
            }
            this.pop();
            this.emitChar(`}`);
            this.emitChar(';');
        }
        // NOTE: emit as prologue!
        this.end(true);
    }


    parsePresets(fx: ITechniqueInstruction): IPreset[] {
        return fx.presets.map((preset, i): IPreset => {
            const name = preset.name;
            const desc = null; // todo
            const data = preset.props.map((prop): IPresetEntry => {
                const decl = prop.resolveDeclaration();
                const type = decl.type;
                const name = decl.name;
                const value = new Uint8Array(16); // todo: don't use fixed size
                const view = new DataView(value.buffer);
                switch (type.name) {
                    case 'float':
                    case 'float2':
                    case 'float3':
                    case 'float4':
                        prop.args.forEach((arg, i) => view.setFloat32(i * 4, (arg as FloatInstruction).value, true));
                        break;
                    case 'int':
                    case 'int2':
                    case 'int3':
                    case 'int4':
                        prop.args.forEach((arg, i) => view.setInt32(i * 4, (arg as IntInstruction).value, true));
                    case 'uint':
                    case 'uint2':
                    case 'uint3':
                    case 'uint4':
                        prop.args.forEach((arg, i) => view.setUint32(i * 4, (arg as IntInstruction).value, true));
                    case 'bool':
                        prop.args.forEach((arg, i) => view.setInt32(i * 4, +(arg as BoolInstruction).value, true));
                        break;
                }
                return { name, value };
            });
            return { name, desc, data };
        });
    }


    emitPartFxDecl(fx: IPartFxInstruction): IPartFxReflection {
        if (!fx.particle) {
            return null;
        }

        // note: only one effect can be tranclated at a time 
        this.tech = fx;

        const { name, capacity } = fx;

        const CSParticlesSpawnRoutine = this.emitSpawnShader();
        const CSParticlesResetRoutine = this.emitResetShader();
        const CSParticlesUpdateRoutine = fx.updateRoutine && this.emitUpdateShader();
        const CSParticlesInitRoutine = fx.initRoutine && this.emitInitShader();

        const passes = fx.passList.map((pass, i): IPartFxPassReflection => {
            const { prerenderRoutine, vertexShader, pixelShader, drawMode } = pass;
            let { sorting, geometry, instanceCount } = pass;
            let VSParticleShader: string = null;
            let PSParticleShader: string = null;
            let CSParticlesPrerenderRoutine: ICSShaderReflection = null;
            let renderStates = pass.renderStates;

            if (prerenderRoutine && drawMode === EPassDrawMode.k_Auto) {
                CSParticlesPrerenderRoutine = this.emitPrerenderShader(pass, i);
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
                renderStates,
                CSParticlesPrerenderRoutine,
                drawMode
            };
        });

        const presets = this.parsePresets(fx);
        this.emitSpawnOpContainer();

        const { typeName: particle } = this.resolveType(fx.particle);
        const controls = this.controls;

        return {
            name,
            capacity,
            particle,
            passes,
            CSParticlesSpawnRoutine,
            CSParticlesResetRoutine,
            CSParticlesInitRoutine,
            CSParticlesUpdateRoutine,
            controls,
            presets
        };
    }


    emitTechniqueDecl(tech: ITechniqueInstruction): ITechniqueReflection {
        // note: only one effect can be tranclated at a time 
        this.tech = tech;
        const { name } = tech;

        const passes = tech.passList.map((pass, i): IPassReflection => {
            const { vertexShader, pixelShader } = pass;

            let VSParticleShader: string = null;
            let PSParticleShader: string = null;

            if (vertexShader) {
                this.emitFunction(vertexShader);
                VSParticleShader = vertexShader.name;
            }

            if (pixelShader) {
                this.emitFunction(pixelShader);
                PSParticleShader = pixelShader.name;
            }

            // todo: 
            const matInstance = vertexShader?.def.params[0].type;
            const { typeName: instance } = this.resolveType(matInstance);

            const renderStates = pass.renderStates;

            return {
                instance,
                VSParticleShader,
                PSParticleShader,
                renderStates
            };
        });

        const controls = this.controls;
        const presets = this.parsePresets(tech);

        return {
            name,
            passes,
            controls,
            presets
        };
    }
}


export function translateFlat(fx: ITechniqueInstruction): string {
    const emitter = new FxTranslator();
    switch (fx.instructionType) {
        case EInstructionTypes.k_PartFxDecl:
            emitter.emitPartFxDecl(<IPartFxInstruction>fx);
            break;
        case EInstructionTypes.k_TechniqueDecl:
            emitter.emitTechniqueDecl(fx);
            break;
        default:
            console.assert(false);
    }
    return emitter.toString();
}

