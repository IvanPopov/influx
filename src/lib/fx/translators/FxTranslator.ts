import { assert } from "@lib/common";
import { type } from "@lib/fx/analisys/helpers";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { StringInstruction } from "@lib/fx/analisys/instructions/StringInstruction";
import { isBoolBasedType, isFloatBasedType, isIntBasedType, isUintBasedType, T_FLOAT, T_FLOAT4, T_INT, T_VOID } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IInitExprInstruction, ILiteralInstruction, IPostfixPointInstruction, ITechniqueInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { EPassDrawMode, IDrawStmtInstruction, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";
import { CodeReflection, IBufferReflection, ICodeEmitterOptions, IConvolutionPack, ICSShaderReflection, IUavReflection } from "./CodeEmitter";

import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { FxEmitter } from "./FxEmitter";

export interface IPresetEntry { name: string; value: Uint8Array; }


export interface IPreset {
    name: string;
    desc: string;
    data: IPresetEntry[];
}


export interface IPassReflection {
    instance: string;
    VSParticleShader: string;
    PSParticleShader: string;

    renderStates: { [key: number/* ERenderStates */]: ERenderStateValues };
}


export interface ITechniqueReflection {
    name: string;
    passes: IPassReflection[];
    controls: IUIControl[];
    presets: IPreset[];
}



export interface ITriMeshReflection {
    name: string; // original name
    vertexCountUName: string;
    faceCountUName: string;
    verticesName: string;
    facesName: string;
    adjacencyName: string; // GS suitable adj info, 6 x nFaces
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
    UIType: 'Float3' | 'Float4' | 'Color'; // Color <=> Float4
}


export interface IUIConstant extends IUIControlBase {
    UIType: 'Float' | 'Int' | 'Uint';
}


export type IUIControl = IUISpinner | IUIConstant | IUIVector;

// returns hlsl system type name corresponding to ui type
export function typeNameOfUIControl(ctrl: IUIControl) {
    const type = ctrl.UIType;
    switch (type) {
        case 'Color':
        case 'Float4':
            return 'float4';
        case 'Float3':
            return 'float3';
        case 'Float':
        case 'FloatSpinner':
            return 'float';
        case 'Spinner':
        case 'Int':
            return 'int';
        case 'Uint':
            return 'uint';
        default:
            console.assert(false, `unsupported UI type: ${type}`);
    }
    return null;
}

// returns byte length
export function sizeofUIControl(ctrl: IUIControl) {
    switch (typeNameOfUIControl(ctrl)) {
        case 'float4':
            return 4 * 4;
        case 'float3':
            return 3 * 4;
        case 'float':
        case 'int':
        case 'uint':
            return 1 * 4;
        default:
            console.assert(false, `unsupported UI type: ${ctrl.UIType}`);
    }
    return 0;
}


const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);


export interface IFxTranslatorOptions extends ICodeEmitterOptions {
    uiControlsGatherToDedicatedConstantBuffer?: boolean;
    uiControlsConstantBufferRegister?: number;
    uiControlsConstantBufferName?: string;

    globalUniformsGatherToDedicatedConstantBuffer?: boolean;
    globalUniformsConstantBufferRegister?: number;
    globalUniformsConstantBufferName?: string;
}


export class FxReflection extends CodeReflection {
    techniques: ITechniqueReflection[] = [];
    controls: IUIControl[] = [];
    globalUniforms: IVariableDeclInstruction[] = [];
    spawnCtors: IFunctionDeclInstruction[] = [];
    drawOps: IDrawOpReflection[] = [];
    triMeshes: ITriMeshReflection[] = [];


    checkTechnique(name: string): boolean {
        return this.techniques.map(t => t.name).includes(name);
    }


    addTechnique(tech: ITechniqueReflection): boolean {
        if (!this.checkTechnique(tech.name)) {
            this.techniques.push(tech);
            return true;
        }
        return false;
    }


    checkGlobaluniform(name: string): boolean {
        return this.globalUniforms.map(u => u.name).includes(name);
    }


    addGlobalUniform(src: IVariableDeclInstruction): boolean {
        if (this.checkGlobaluniform(src.name)) {
            return false;
        }

        this.globalUniforms.push(src);
        return true;
    }


    checkControl(name: string): boolean {
        return this.controls.map(c => c.name).includes(name);
    }


    addControl(ctrl: IUIControl): boolean {
        if (!this.checkControl(ctrl.name)) {
            this.controls.push(ctrl);
            return true;
        }
        return false;
    }



    checkTrimesh(name: string): boolean {
        return this.triMeshes.map(t => t.name).includes(name);
    }


    addTrimesh(mesh: ITriMeshReflection): boolean {
        if (!this.checkTrimesh(mesh.name)) {
            this.triMeshes.push(mesh);
            return true;
        }
        return false;
    }


    addDrawOperator() {
        // todo
    }
}


export class FxTranslator<CodeReflectionT extends FxReflection> extends FxEmitter<CodeReflectionT> {
    static UAV_PARTICLES = 'uavParticles';
    static UAV_STATES = 'uavStates';
    static UAV_DEAD_INDICES = 'uavDeadIndices';
    static UAV_CREATION_REQUESTS = 'uavCreationRequests';
    static UAV_PRERENDERED = 'uavPrerendered';
    static UAV_SERIALS = 'uavSerials';
    static UAV_SPAWN_DISPATCH_ARGUMENTS = 'uavSpawnDispatchArguments';
    static UAV_SPAWN_EMITTER = `uavEmitter`;

    private static UAV_PARTICLES_DESCRIPTION = `The buffer contains user-defined particle data.`;
    private static UAV_STATES_DESCRIPTION = `The buffer contains the state of the particles, Alive or dead.`;
    private static UAV_DEAD_INDICES_DESCRIPTION = `The buffer contains indicies of dead particles.`;
    private static UAV_CREATION_REQUESTS_DESCRIPTION = 'The buffer contatins information about the number and type of particles to be created';
    private static UAV_SERIALS_DESCRIPTION = 'The buffer contains hashes are required for correct sorting during render buffer filling.';
    private static UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION = 'The buffer contains arguments of dispatch required to run initialization of new particles.';
    private static UAV_SPAWN_EMITTER_DESCRIPTION = 'The buffer containts constant data avaialble across frames.';


    private static SPAWN_OPERATOR_POLYFILL_NAME = '__spawn_op';
    private static SPAWN_OPERATOR_TYPE = '__SPAWN_T__';
    private static DRAW_OPERATOR_POLYFILL_NAME = '__draw_op';

    declare protected options: IFxTranslatorOptions;

    // todo: addDrawop
    // todo: addSpawnOp

    constructor(textDocument?: ITextDocument, slastDocument?: ISLASTDocument, opts?: IFxTranslatorOptions) {
        super(textDocument, slastDocument, opts);
    }


    /*
        https://help.autodesk.com/view/MAXDEV/2023/ENU/?guid=shader_semantics_and_annotations
        https://help.autodesk.com/view/MAXDEV/2022/ENU/?guid=Max_Developer_Help_3ds_max_sdk_features_rendering_programming_hardware_shaders_shader_semantics_and_annotations_supported_hlsl_shader_annotation_html
    */
    protected addControl(cref: CodeReflectionT, src: IVariableDeclInstruction): boolean {
        let ctrl: IUIControl = { UIType: null, UIName: null, name: null, value: null };

        if (!src.annotation) {
            return false;
        }

        if (!src.isGlobal()) {
            return false;
        }

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

        src.initExpr?.args.forEach(arg => {
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

        // todo: validate controls
        if (ctrl.UIType) {
            ctrl.value = new Uint8Array(buffer);
            ctrl.name = src.id.name;

            cref.addControl(ctrl);
            return true;
        }

        return false;
    }


    protected trimeshBaseName(name: string) {
        return `trim${name[0].toUpperCase()}${name.slice(1)}`;
    }


    protected isTrimesh(type: IVariableTypeInstruction): boolean {
        const TRIMESH_NAME = 'TriMesh';
        return !!type?.name.includes(TRIMESH_NAME);
    }


    protected emitTrimeshDecl(cref: CodeReflectionT, decl: IVariableDeclInstruction): ITriMeshReflection {
        const type = decl.type;
        const regexp = /^([\w]+)<([\w0-9_]+)>$/;
        const match = type.name.match(regexp);
        assert(match);

        // uavType: match[1],
        // elementType: match[2],

        const elementType = decl.scope.findType(match[2]);
        const name = decl.name;
        const baseName = this.trimeshBaseName(name);
        // todo: check that such a variable doesn't exists
        const vertexCountUName = `${baseName}VertexCount`;
        const faceCountUName = `${baseName}FaceCount`;
        const verticesName = `${baseName}Vertices`;
        const facesName = `${baseName}Faces`;
        const adjacencyName = `${baseName}Adjacency`;

        if(!cref.checkTrimesh(name)) {
            const { typeName: elementTypeName } = this.resolveType(cref, elementType);

            // uniform uint trimesh0_vert_count;
            // uniform uint trimesh0_face_count;
            // StructuredBuffer<Vert> trimesh0_vert;
            // Buffer<uint3> trimesh0_faces;
            // Buffer<uint> trimesh0_faces_adj;
            
            this.emitGlobalRaw(cref, vertexCountUName, `uniform uint ${vertexCountUName}`);

            this.emitGlobalRaw(cref, faceCountUName, `uniform uint ${faceCountUName}`);
            
            // if (this.addBuffer())
            const vertices = this.emitBuffer(cref, `StructuredBuffer<${elementTypeName}>`, verticesName);
            // if (this.addBuffer())
            const faces = this.emitBuffer(cref, `Buffer<uint3>`, facesName);
            // if (this.addBuffer())
            const adjacency = this.emitBuffer(cref, `Buffer<uint>`, adjacencyName);

            this.begin();
            this.emitLine(`void ${baseName}_GetDimensions(out uint vertCount, out uint faceCount)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`vertCount = ${vertexCountUName};`);
                this.emitLine(`faceCount = ${faceCountUName};`);
            }
            this.pop();
            this.emitChar('}');
            
            this.emitNewline();
            this.emitNewline();

            this.emitLine(`${elementTypeName} ${baseName}_LoadVertex(uint vert)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`return ${verticesName}[vert];`);
            }
            this.pop();
            this.emitChar('}');

            this.emitNewline();
            this.emitNewline();

            this.emitLine(`uint3 ${baseName}_LoadFace(uint face)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`return ${facesName}[face];`);
            }
            this.pop();
            this.emitChar('}');

            this.emitNewline();
            this.emitNewline();

            this.emitLine(`void ${baseName}_LoadGSAdjacency(uint face, out uint vertices[6])`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint offset = face * 6u;`);
                this.emitLine(`vertices[0] = ${adjacencyName}[offset];`);
                this.emitLine(`vertices[1] = ${adjacencyName}[offset + 1];`);
                this.emitLine(`vertices[2] = ${adjacencyName}[offset + 2];`);
                this.emitLine(`vertices[3] = ${adjacencyName}[offset + 3];`);
                this.emitLine(`vertices[4] = ${adjacencyName}[offset + 4];`);
                this.emitLine(`vertices[5] = ${adjacencyName}[offset + 5];`);
            }
            this.pop();
            this.emitChar('}');


            this.end();

            // todo: move to reflection
            const refl: ITriMeshReflection = {
                name,

                vertexCountUName,
                faceCountUName,

                verticesName,
                facesName,
                adjacencyName
            };
            
            cref.addTrimesh(refl);
            return refl;
        }

        return cref.triMeshes.find(t => t.name == name);
    }


    emitTriMeshCall(cref: CodeReflectionT, call: IFunctionCallInstruction) {
        switch (call.decl.name) {
            case 'LoadFace':
            case 'LoadVertex':
            case 'LoadGSAdjacency':
            case 'GetDimensions':
                {
                    // note: it makes imporsible to pass tri meshes as function arguments
                    assert(call.callee.instructionType === EInstructionTypes.k_IdExpr);
                    const id = <IIdExprInstruction>call.callee;

                    this.emitGlobalVariable(cref, id.decl);
                    
                    this.emitKeyword(`${this.trimeshBaseName(id.name)}_${call.decl.name}`);
                    this.emitNoSpace();
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitExpressionList(cref, call.args);
                    this.emitChar(')');
                }
                break;
            default:
                assert(false);
        }
    }


    emitFCall(cref: CodeReflectionT, call: IFunctionCallInstruction, rename?) {
       if (this.isTrimesh(call.callee?.type)) {
            this.emitTriMeshCall(cref, call);
            return;
       }

       super.emitFCall(cref, call, rename);
    }


    emitGlobalVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction): void {
        if (this.isTrimesh(decl.type)) {
            this.emitTrimeshDecl(cref, decl);
            return;
        }

        super.emitGlobalVariable(cref, decl);
    }


    protected emitControlVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string) {
        if (!this.options.uiControlsGatherToDedicatedConstantBuffer) {
            // quick way to promote uniform qualifier to GLSL code
            (this.emitKeyword('uniform'), this.emitVariableNoInit(cref, decl, rename));
        }
    }


    protected emitUniformVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction) {
        const KNOWN_EXTERNAL_GLOBALS = [
            'ELAPSED_TIME',
            'ELAPSED_TIME_LEVEL',
            'FRAME_NUMBER',

            'PARENT_POSITION',
            'CAMERA_POSITION'
        ];

        const semantic = decl.semantic || camelToSnakeCase(decl.name).toUpperCase();

        if (!KNOWN_EXTERNAL_GLOBALS.includes(semantic)) {
            super.emitVariable(cref, decl);
            console.warn(`Unsupported uniform has been used: ${decl.toCode()}.`);
            return;
        }

        const isGlobal = true; // global update required
        const isLocal = false; // per object update required

        if (!this.options.globalUniformsGatherToDedicatedConstantBuffer && isGlobal) {
            super.emitVariable(cref, decl);
            return;
        }

        if (isGlobal)
            cref.addGlobalUniform(decl);
    }


    // todo: remove hack with rename mutator
    emitVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        if (this.addControl(cref, decl)) {
            this.emitControlVariable(cref, decl, rename);
            return;
        }

        if (decl.type.isUniform()) {
            this.emitUniformVariable(cref, decl);
            return;
        }

        super.emitVariable(cref, decl, rename);
    }


    protected emitSpawnStmt(cref: CodeReflectionT, stmt: ISpawnStmtInstruction) {
        const fx = <IPartFxInstruction>this.tech;

        const args = [fx.particle, T_INT, ...stmt.args.map(a => a.type)];
        const init = stmt.scope.findFunction(stmt.name, args);

        if (!init) {
            console.error(`could not find spawn inititalizer: ${stmt.name}(${args.map(a => a.name).join(', ')})`);
            return;
        }

        let guid = cref.spawnCtors.findIndex(ctor => ctor === init) + 1;


        if (guid === 0) {
            cref.spawnCtors.push(init);
            guid = cref.spawnCtors.length;

            this.emitSpawnOperator(cref, guid, init);
        }

        this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitKeyword(`(uint)`);
        this.emitNoSpace();
        this.emitExpression(cref, stmt.count);
        if (stmt.args.length) {
            this.emitChar(',');
            this.emitExpressionList(cref, stmt.args);
        }
        this.emitChar(')');
        this.emitChar(';');
        this.emitNewline();

        // super.emitSpawnStmt(stmt);
    }


    protected emitDrawStmt(cref: CodeReflectionT, { name, args }: IDrawStmtInstruction) {
        const fx = <IPartFxInstruction>this.tech;//<IPartFxInstruction>pass.parent;
        const pass = fx.passList.find(pass => pass.name == name);

        if (!pass) {
            console.warn(`pass<${name}> for draw operator has not been found.`);
            return;
        }

        const i = fx.passList.indexOf(pass);
        // todo: use addDrawOperator()
        if (cref.drawOps.map(r => r.name).indexOf(name) == -1) {
            const uavs = [];
            const prerenderFn = pass.prerenderRoutine.function;
            if (cref.addFunction(prerenderFn)) {
                this.emitFunction(cref, prerenderFn);
            }
            this.emitPrerenderRoutune(cref, pass, i, uavs);
            cref.drawOps.push({ name, uavs });
        }
        this.emitKeyword(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}`);
        this.emitChar(`(`);
        this.emitNoSpace();
        this.emitExpressionList(cref, args);
        this.emitChar(`)`);
        this.emitChar(';');
        this.emitNewline();
    }


    protected emitResetShader(cref: CodeReflectionT): ICSShaderReflection {
        const name = 'CSParticlesResetRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const shader: ICSShaderReflection = { name, numthreads, uavs };
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

                uavs.push(this.emitUav(cref, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_DEAD_INDICES}[tid] = tid;`);

                uavs.push(this.emitUav(cref, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_STATES}[tid] = 0;`);

                const { typeName: partType } = this.resolveType(cref, fx.particle);
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
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

                // reset emitter if required
                const spawnFn = fx.spawnRoutine.function;
                if (spawnFn.def.params.length > 0) {
                    const p0 = spawnFn.def.params[0];
                    this.emitLine(`if (tid == 0)`);
                    this.emitChar('{');
                    this.push();
                    {
                        uavs.push(this.emitUav(cref, `RWStructuredBuffer<${p0.type.name}>`,
                            `${FxTranslator.UAV_SPAWN_EMITTER}`, FxTranslator.UAV_SPAWN_EMITTER_DESCRIPTION));

                        this.emitLine(`${p0.type.name} ${p0.name};`);
                        if (p0.type.isComplex()) {
                            for (const field of p0.type.fields) {
                                if (field.type.isComplex()) {
                                    // todo: add support
                                    continue;
                                }

                                if (field.initExpr) {
                                    this.emitKeyword(`${p0.name}.${field.name} =`);
                                    this.emitExpression(cref, field.initExpr);
                                    this.emitChar(';');
                                    this.emitNewline();
                                } else {
                                    this.emitKeyword(`${p0.name}.${field.name} =`);
                                    this.emitKeyword(`(${field.type.name})0`);
                                    this.emitChar(';');
                                    this.emitNewline();
                                }
                            }
                        } else {
                            // todo: add support of system types
                        }
                        this.emitLine(`${FxTranslator.UAV_SPAWN_EMITTER}[0] = ${p0.name};`);
                    }
                    this.pop();
                    this.emitChar('}');
                }
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        cref.addCsShader(shader);
        return shader;
    }


    // TOOD: sync groupSize with value used inside the emitInitShader();
    protected emitSpawnOperator(cref: CodeReflectionT, guid: number, ctor: IFunctionDeclInstruction, groupSize: number = 64) {
        this.begin();
        {
            this.emitKeyword('void');
            this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitKeyword(`uint nPart`);
            if (ctor && ctor.def.params.length > 2) {
                this.emitChar(',');
                this.emitParams(cref, ctor.def.params.slice(2));
            }
            this.emitChar(')');
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                this.emitUav(cref, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
                    FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION);
                this.emitUav(cref, `RWBuffer<uint>`,
                    FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION);

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
    }


    protected emitGlobalRaw(cref: CodeReflectionT, name: string, content: string) {
        if (cref.addGlobal(name)) {
            this.begin();
            this.emitChar(`${content};`);
            this.emitNewline();
            this.end();
        }
    }


    protected emitSpawnShader(cref: CodeReflectionT): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
        if (!fx.spawnRoutine) {
            return null;
        }

        const spawnFn = fx.spawnRoutine.function;
        const elapsedTime = fx.scope.findVariable('elapsedTime');

        const name = 'CSParticlesSpawnRoutine';
        const numthreads = [1, 1, 1];
        const uavs = [];

        const shader = <ICSShaderReflection>{ name, numthreads, uavs };

        uavs.push(this.emitUav(cref, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
            FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
        uavs.push(this.emitUav(cref, `RWBuffer<uint>`,
            FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION));

        if (fx.initRoutine) {
            // default spawn op needed only if regulat emission is used
            this.emitSpawnOperator(cref, 0, null);
        }

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

                if (cref.addFunction(spawnFn)) {
                    this.emitFunction(cref, spawnFn);
                }

                if (elapsedTime) {
                    this.emitGlobal(cref, elapsedTime);
                } else {
                    // IP: remove this hack
                    this.emitGlobalRaw(cref, 'elapsedTime', 'uniform float elapsedTime');
                }

                // todo: move to dispatch arguments reset routine
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0] = 0u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[1] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[2] = 1u;`);

                if (type.equals(spawnFn.def.returnType, T_VOID)) {
                    if (spawnFn.def.params.length == 1) {
                        const p0 = spawnFn.def.params[0];

                        uavs.push(this.emitUav(cref, `RWStructuredBuffer<${p0.type.name}>`,
                            `${FxTranslator.UAV_SPAWN_EMITTER}`, FxTranslator.UAV_SPAWN_EMITTER_DESCRIPTION));

                        this.emitChar('{');
                        this.push();
                        this.emitLine(`${p0.type.name} ${p0.name} = ${FxTranslator.UAV_SPAWN_EMITTER}[0];`);
                        this.emitLine(`${spawnFn.name}(${p0.name});`);
                        this.emitLine(`${FxTranslator.UAV_SPAWN_EMITTER}[0] = ${p0.name};`);
                        this.pop();
                        this.emitChar('}');
                    } else {
                        this.emitLine(`${spawnFn.name}();`);
                    }
                } else {
                    assert(type.equals(spawnFn.def.returnType, T_INT));

                    this.emitLine(`float nPartAddFloat = asfloat(${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[3]) + (float)${spawnFn.name}() * elapsedTime;`);
                    this.emitLine(`float nPartAdd = floor(nPartAddFloat);`);
                    // TODO: replace with InterlockedExchange()

                    this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[3] = asuint(nPartAddFloat - nPartAdd);`);
                    this.emitLine(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}0__((uint)nPartAdd);`);
                }
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        cref.addCsShader(shader);
        return shader;
    }


    protected emitInitShader(cref: CodeReflectionT): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
        const initFn = fx.initRoutine?.function;

        const name = 'CSParticlesInitRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const shader = <ICSShaderReflection>{ name, numthreads, uavs };

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
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`, FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
                this.emitLine(`uint nPart = ${FxTranslator.UAV_CREATION_REQUESTS}[GroupId].count;`);
                this.emitNewline();
                this.emitLine(`if (ThreadId >= nPart) return;`);
                this.emitNewline();
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
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

                const { typeName: partType } = this.resolveType(cref, fx.particle);
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle;`);

                // it's ok if here is no init function found
                // it means that generic spawner is used
                if (initFn && cref.addFunction(initFn))
                    this.emitFunction(cref, initFn);

                const request = `${FxTranslator.UAV_CREATION_REQUESTS}[GroupId]`;

                this.emitLine(`uint type = ${request}.type;`);

                if (initFn) {
                    this.emitLine(`if (type == 0u)`);
                    this.emitChar('{');
                    this.push();
                    {
                        this.emitLine(`${initFn.name}(Particle${initFn.def.params.length > 1 ? ', PartId' : ''});`);
                    }
                    this.pop();
                    this.emitChar('}');
                    this.emitNewline();
                }

                cref.spawnCtors.forEach((ctor, i) => {
                    if (cref.addFunction(ctor))
                        this.emitFunction(cref, ctor);

                    if (initFn || i > 0) {
                        this.emitKeyword(`else`);
                        this.emitSpace();
                    }

                    this.emitLine(`if (type == ${i + 1}u)`);
                    this.emitChar('{');
                    this.push();
                    {
                        // TODO: move param unpacking to separate function
                        // unpack arguments
                        let nfloat = 0;
                        let params = ctor.def.params.slice(2);
                        params.forEach(param => {
                            this.emitVariable(cref, param);
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

                        this.emitKeyword(ctor.name);
                        this.emitChar('(');
                        this.emitNoSpace();
                        this.emitKeyword('Particle');
                        this.emitChar(',');
                        this.emitKeyword('PartId');
                        if (params.length > 0) {
                            this.emitChar(',');
                            params.forEach((param, i, list) => {
                                this.emitKeyword(param.name);
                                (i + 1 != list.length) && this.emitChar(', ');
                            });
                        }
                        this.emitChar(')');
                        this.emitChar(';');
                        this.emitNewline();
                    }
                    this.pop();
                    this.emitChar('}');
                    this.emitNewline();
                });
                this.emitLine(`${FxTranslator.UAV_PARTICLES}[PartId] = Particle;`);
                this.emitComment('set particles\'s state as \'Alive\'');
                uavs.push(this.emitUav(cref, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`${FxTranslator.UAV_STATES}[PartId] = 1;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        cref.addCsShader(shader);
        return shader;
    }


    protected emitUpdateShader(cref: CodeReflectionT): ICSShaderReflection {
        const fx = <IPartFxInstruction>this.tech;
        const updateFn = fx.updateRoutine.function;

        const name = 'CSParticlesUpdateRoutine';
        const numthreads = [64, 1, 1];
        const uavs = [];

        const shader = <ICSShaderReflection>{ name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(cref, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                const { typeName: partType } = this.resolveType(cref, fx.particle);
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);
                this.emitNewline();

                if (cref.addFunction(updateFn)) {
                    this.emitFunction(cref, updateFn);
                }

                this.emitLine(`[branch]`);
                this.emitLine(`if (!${updateFn.name}(Particle${updateFn.def.params.length > 1 ? ', PartId' : ''}))`);
                this.emitChar('{');
                this.push();
                {
                    uavs.push(this.emitUav(cref, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION));
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

        uavs.push(...cref.drawOps.map(r => r.uavs).flat());

        // hack
        uavs.push(this.emitUav(cref, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
            FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION));
        uavs.push(this.emitUav(cref, `RWBuffer<uint>`,
            FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION));

        cref.addCsShader(shader);
        return shader;
    }


    protected emitPrerenderRoutune(cref: CodeReflectionT, pass: IPartFxPassInstruction, i: number, uavs: IUavReflection[]) {
        const fx = <IPartFxInstruction>this.tech;
        const prerenderFn = pass.prerenderRoutine.function;
        const { typeName: prerenderedType } = this.resolveType(cref, prerenderFn.def.params[1].type);
        const { typeName: partType } = this.resolveType(cref, fx.particle);
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
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${prerenderedType}>`, `${FxTranslator.UAV_PRERENDERED}${i}`));

                if (pass.sorting) {
                    uavs.push(this.emitUav(cref, `RWStructuredBuffer<int2>`, `${FxTranslator.UAV_SERIALS}${i}`, FxTranslator.UAV_SERIALS_DESCRIPTION));
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


    protected emitPrerenderShader(cref: CodeReflectionT, pass: IPartFxPassInstruction, i: number): ICSShaderReflection {
        const prerenderFn = pass.prerenderRoutine.function;

        const name = `CSParticlesPrerenderShader${i}`;
        const numthreads = [64, 1, 1];
        const uavs = [];
        const fx = <IPartFxInstruction>this.tech;

        const shader = <ICSShaderReflection>{ name, numthreads, uavs };

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                uavs.push(this.emitUav(cref, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION));
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                if (cref.addFunction(prerenderFn)) {
                    this.emitFunction(cref, prerenderFn);
                }

                const { typeName: partType } = this.resolveType(cref, fx.particle);
                uavs.push(this.emitUav(cref, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION));
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);

                this.emitPrerenderRoutune(cref, pass, i, uavs);
                this.emitLine(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}(Particle);`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        cref.addCsShader(shader);
        return shader;
    }


    protected emitSpawnOpContainer(cref: CodeReflectionT) {
        const payloadSize = cref.spawnCtors.map(
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


    protected finalizeTechnique(cref: CodeReflectionT) {
        if (this.options.globalUniformsGatherToDedicatedConstantBuffer) {
            const index = this.options.globalUniformsConstantBufferRegister || -1;

            // check that no one uses the same register
            for (let name in this.tech.scope.cbuffers) {
                let cbuf = this.tech.scope.cbuffers[name];
                if (cbuf.register.index === index) {
                    console.error(`register ${index} is already used by cbuffer '${cbuf.name}'`);
                }
            }

            const name = this.options.globalUniformsConstantBufferName || 'GLOBAL_UNIFORMS';
            this.begin();
            {
                this.emitKeyword('cbuffer');
                this.emitKeyword(name);

                if (index !== -1) {
                    this.emitChar(':');
                    this.emitKeyword('register');
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitKeyword(`b${index}`);
                    this.emitNoSpace();
                    this.emitChar(')');
                }

                this.emitNewline();
                this.emitChar('{');
                this.push();
                {
                    cref.globalUniforms.forEach(({ name, type, semantic }) => {
                        this.emitKeyword(type.name);
                        this.emitKeyword(name);
                        type.isNotBaseArray() && this.emitChar(`[${type.length}]`);
                        if (semantic) {
                            this.emitSemantic(cref, semantic);
                        } else {
                            this.emitSemantic(cref, camelToSnakeCase(name).toUpperCase());
                        }

                        this.emitChar(';');
                        this.emitNewline();
                    });
                }
                this.pop();
                this.emitChar('}');
                this.emitChar(';');
            }
            this.end(true); // move to prologue
        }

        if (this.options.uiControlsGatherToDedicatedConstantBuffer) {
            const index = this.options.uiControlsConstantBufferRegister || -1;

            // check that no one uses the same register
            for (let name in this.tech.scope.cbuffers) {
                let cbuf = this.tech.scope.cbuffers[name];
                if (cbuf.register.index === index) {
                    console.error(`register ${index} is already used by cbuffer '${cbuf.name}'`);
                }
            }

            const name = this.options.uiControlsConstantBufferName || 'AUTOGEN_CONTROLS';
            this.begin();
            {
                this.emitKeyword('cbuffer');
                this.emitKeyword(name);

                if (index !== -1) {
                    this.emitChar(':');
                    this.emitKeyword('register');
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitKeyword(`b${index}`);
                    this.emitNoSpace();
                    this.emitChar(')');
                }

                this.emitNewline();
                this.emitChar('{');
                this.push();
                {
                    cref.controls.forEach(ctrl => {
                        this.emitKeyword(typeNameOfUIControl(ctrl));
                        this.emitKeyword(ctrl.name);
                        this.emitChar(';');
                        this.emitNewline();
                    });
                }
                this.pop();
                this.emitChar('}');
                this.emitChar(';');
            }
            this.end(true); // move to prologue
        }
    }


    emitPartFxDecl(cref: CodeReflectionT, fx: IPartFxInstruction): IPartFxReflection {
        if (!fx.particle) {
            return null;
        }

        // note: only one effect can be tranclated at a time 
        this.tech = fx;

        const { name, capacity } = fx;

        const CSParticlesSpawnRoutine = this.emitSpawnShader(cref);
        const CSParticlesResetRoutine = this.emitResetShader(cref);
        const CSParticlesUpdateRoutine = fx.updateRoutine && this.emitUpdateShader(cref);
        const CSParticlesInitRoutine = this.emitInitShader(cref);

        const passes = fx.passList.map((pass, i): IPartFxPassReflection => {
            const { prerenderRoutine, vertexShader: vs, pixelShader: ps, drawMode } = pass;
            let { sorting, geometry, instanceCount } = pass;
            let VSParticleShader: string = null;
            let PSParticleShader: string = null;
            let CSParticlesPrerenderRoutine: ICSShaderReflection = null;
            let renderStates = pass.renderStates;

            if (prerenderRoutine && drawMode === EPassDrawMode.k_Auto) {
                CSParticlesPrerenderRoutine = this.emitPrerenderShader(cref, pass, i);
            }

            if (vs && cref.addFunction(vs)) {
                this.emitFunction(cref, vs);
                VSParticleShader = vs.name;
            }

            if (ps && cref.addFunction(ps)) {
                this.emitFunction(cref, ps);
                PSParticleShader = ps.name;
            }

            const { typeName: instance } = this.resolveType(cref, pass.particleInstance);

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

        const presets = FxTranslator.parsePresets(fx);
        this.emitSpawnOpContainer(cref);

        const { typeName: particle } = this.resolveType(cref, fx.particle);
        const controls = cref.controls;

        this.finalizeTechnique(cref);

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


    emitTechniqueDecl(cref: CodeReflectionT, tech: ITechniqueInstruction): ITechniqueReflection {
        // note: only one effect can be tranclated at a time 
        this.tech = tech;
        const { name } = tech;

        const passes = tech.passList.map((pass, i): IPassReflection => {
            const { vertexShader, pixelShader } = pass;

            let VSParticleShader: string = null;
            let PSParticleShader: string = null;

            if (vertexShader) {
                VSParticleShader = vertexShader.name;
            }

            if (pixelShader) {
                PSParticleShader = pixelShader.name;
            }

            // todo: 
            const matInstance = vertexShader?.def.params[0].type;
            const { typeName: instance } = this.resolveType(cref, matInstance);

            const renderStates = pass.renderStates;

            return {
                instance,
                VSParticleShader,
                PSParticleShader,
                renderStates
            };
        });

        const controls = cref.controls;
        const presets = FxTranslator.parsePresets(tech);

        const reflection = {
            name,
            passes,
            controls,
            presets
        };

        if (cref.addTechnique(reflection)) {
            tech.passList.forEach((pass, i) => {
                const { vertexShader: vs, pixelShader: ps } = pass;
                if (vs) {
                    if (cref.addFunction(vs)) {
                        this.emitFunction(cref, vs);
                    }
                }
                if (ps) {
                    if (cref.addFunction(ps)) {
                        this.emitFunction(cref, ps);
                    }
                }
            });
        }

        this.finalizeTechnique(cref);

        return reflection;
    }

    static parsePresets(fx: ITechniqueInstruction): IPreset[] {
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
}


export function translateFlat(fx: ITechniqueInstruction, { textDocument, slastDocument }: IConvolutionPack = {}, opts: IFxTranslatorOptions = {}): string {
    const emitter = new FxTranslator(textDocument, slastDocument, opts);
    const cref = new FxReflection;
    switch (fx.instructionType) {
        case EInstructionTypes.k_PartFxDecl:
            emitter.emitPartFxDecl(cref, <IPartFxInstruction>fx);
            break;
        case EInstructionTypes.k_TechniqueDecl:
            emitter.emitTechniqueDecl(cref, fx);
            break;
        default:
            console.assert(false);
    }
    return emitter.toString();
}

