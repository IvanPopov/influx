import { assert, isDef } from "@lib/common";
import { types } from "@lib/fx/analisys/helpers";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { StringInstruction } from "@lib/fx/analisys/instructions/StringInstruction";
import { isBoolBasedType, isFloatBasedType, isIntBasedType, isUintBasedType, T_FLOAT, T_FLOAT4, T_INT, T_VOID } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, ITechnique11Instruction, ITechniqueInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { EPassDrawMode, IDrawStmtInstruction, IPartFxInstruction, IPartFxPassInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";
import { ICSShaderReflection, IUniformReflection } from "./CodeEmitter";
import * as SystemScope from '@lib/fx/analisys/SystemScope';
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { ICodeConvolutionContextOptions } from "./CodeConvolutionEmitter";
import { FxConvolutionContext, FxEmitter } from "./FxEmitter";
import { ControlValueType, PropertyValueType } from "../bundles/utils";
import { Color, Vector2, Vector3, Vector4 } from "@sandbox/store/IStoreState";

export interface IViewTypeProperty {
    name: string;
    type: string;
    value: PropertyValueType;
}

export interface IUIControl {
    name: string;
    type: string;
    value: ControlValueType;
    properties: IViewTypeProperty[];
}

export interface IPresetEntry {
    name: string;
    type: string;
    value: ControlValueType;
}

export interface IPreset {
    name: string;
    desc: string;
    data: IPresetEntry[];
}

export type IUIControlReflection = IUIControl;

/** @deprecated */
export interface IPassReflection {
    instance: string;
    VSParticleShader: string;
    PSParticleShader: string;

    renderStates: { [key: number/* ERenderStates */]: ERenderStateValues };
}

export interface IPass11Reflection {
    // todo
}


/** @deprecated */
export interface ITechniqueReflection<PassT extends IPassReflection = IPassReflection> {
    name: string;
    passes: PassT[];
    controls: IUIControl[];
    presets: IPreset[];
}


export interface ITechnique11Reflection<PassT extends IPass11Reflection = IPass11Reflection> {
    name: string;
}


export interface ITriMeshReflection {
    name: string; // original name
    vertexCountUName: string;
    faceCountUName: string;
    verticesName: string;
    facesName: string;
    indicesAdjName: string; // GS suitable adj info, 6 x nFaces
    faceAdjName: string;

    // resourcePath: string;
}


export interface IPartFxPassReflection extends IPassReflection {
    sorting: boolean;
    geometry: string;
    instanceCount: number;
    CSParticlesPrerenderRoutine: ICSShaderReflectionEx;
    drawMode: number; // EPassDrawMode (0 - auto, 1 - manual)
}

export interface IPartFxReflection extends ITechniqueReflection<IPartFxPassReflection> {
    capacity: number;
    particle: string; // << particle type name
    CSParticlesSpawnRoutine: ICSShaderReflectionEx;
    CSParticlesResetRoutine: ICSShaderReflectionEx;
    CSParticlesInitRoutine: ICSShaderReflectionEx;
    CSParticlesUpdateRoutine: ICSShaderReflectionEx;
}

// returns hlsl system type name corresponding to ui type
function typeNameOfUIControl(ctrl: IUIControl) {
    const type = ctrl.type;
    switch (type) {
        case 'color':
            return 'float4';
        case 'int':
        case 'uint':
        case 'float':
        case 'float2':
        case 'float3':
        case 'float4':
            return type;
        default:
            console.assert(false, `unsupported UI type: ${type}`);
    }
    return null;
}


function pushUniq<T>(arr: Array<T>, elem: T) {
    if (arr.indexOf(elem) == -1)
        arr.push(elem);
}

const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);


export interface IFxContextExOptions extends ICodeConvolutionContextOptions {
    uiControlsGatherToDedicatedConstantBuffer?: boolean;
    uiControlsConstantBufferRegister?: number;
    uiControlsConstantBufferName?: string;

    globalUniformsGatherToDedicatedConstantBuffer?: boolean;
    globalUniformsConstantBufferRegister?: number;
    globalUniformsConstantBufferName?: string;
}


export interface ICSShaderReflectionEx extends ICSShaderReflection {
    trimeshes: ITriMeshReflection[];
}


const isPartId = (p: IVariableDeclInstruction) => 
    (p.semantic === 'PART_ID' || p.name == 'partId') && types.equals(/u?int/, p.type);
const isSpawnId = (p: IVariableDeclInstruction) => 
    (p.semantic === 'SPAWN_ID' || p.name == 'spawnId') && types.equals(/u?int/, p.type);

interface IOptParam {
    name: string;
    checker: (p: IVariableDeclInstruction) => boolean;
}

function resolveOptIndices(params: IOptParam[], def: IFunctionDefInstruction): number[] {
    return params.map(({ checker }) => def.params.findIndex(checker));
}

function resolveOptArguments(params: IOptParam[], def: IFunctionDefInstruction): string[] {
    const indices = resolveOptIndices(params, def);
    const n = indices.filter(i => i !== -1).length;
    const res = new Array(n);
    for (let i = 0; i < indices.length; ++ i) {
        const pos = indices[i];
        if (pos !== -1) {
            res[pos] = params[i].name;
        }
    }
    return res;
}

export class FxTranslatorContext extends FxConvolutionContext {
    // (!) override
    declare readonly CSShaders: ICSShaderReflectionEx[];

    readonly techniques: (ITechniqueReflection | IPartFxReflection)[] = [];
    readonly techniques11: ITechnique11Reflection[] = [];
    readonly controls: IUIControlReflection[] = [];
    readonly trimeshes: ITriMeshReflection[] = [];
    // todo: use reflection
    readonly uniforms: IUniformReflection[] = [];
    // todo: use reflection
    readonly spawners: IFunctionDeclInstruction[] = [];

    // (!) override
    declare protected CSShader?: ICSShaderReflectionEx;
    // (!) override
    declare readonly opts: IFxContextExOptions;


    // specific reflection, signature has been already added during global variable processing
    addControl(ctrl: IUIControl): IUIControlReflection {
        this.controls.push(ctrl);
        return ctrl;
    }


    addTechnique<T extends ITechniqueReflection | IPartFxReflection>(refl: T): T {
        assert(!this.has(refl.name));
        assert(!isDef(this.techniques[0]));
        this.add(refl.name);
        this.techniques[0] = refl;
        return refl;
    }


    addTechnique11<T extends ITechnique11Reflection>(refl: T): T {
        assert(!this.has(refl.name));
        assert(!isDef(this.techniques[0]));
        this.add(refl.name);
        this.techniques11[0] = refl;
        return refl;
    }


    addUniform(uniform: IUniformReflection): IUniformReflection {
        this.uniforms.push(uniform);
        return uniform;
    }


    addTrimesh(mesh: ITriMeshReflection): ITriMeshReflection {
        assert(!this.has(mesh.name));
        this.add(mesh.name);
        this.trimeshes.push(mesh);
        return mesh;
    }


    addSpawnCtor(decl: IFunctionDeclInstruction): IFunctionDeclInstruction {
        assert(!this.has(decl.name));
        this.add(decl.name);
        this.spawners.push(decl);
        return decl;
    }


    linkTrimesh(name: string) {
        assert(this.has(name));
        // push if not exists
        let sh = this.CSShader;
        if (sh) {
            pushUniq(sh.trimeshes, this.trimeshes.find(t => t.name == name));
        }
    }

    // override CodeEmitterContext::beginCsShader()
    beginCsShader(name: string, numthreads: number[]) {
        const uavs = [];
        const buffers = [];
        const textures = [];
        const trimeshes = [];
        this.CSShader = { name, numthreads, uavs, buffers, textures, trimeshes };
    }
}


export class FxTranslator<ContextT extends FxTranslatorContext> extends FxEmitter<ContextT> {
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

    private static CS_PARTICLE_RESET_ROUTINE = 'CSParticlesResetRoutine';
    private static CS_PARTICLE_SPAWN_ROUTINE = 'CSParticlesSpawnRoutine';
    private static CS_PARTICLE_INIT_ROUTINE = 'CSParticlesInitRoutine';
    private static CS_PARTICLE_UPDATE_ROUTINE = 'CSParticlesUpdateRoutine';
    private static CS_PARTICLE_PRERENDER_SHADER = 'CSParticlesPrerenderShader';


    /*
        https://help.autodesk.com/view/MAXDEV/2023/ENU/?guid=shader_semantics_and_annotations
        https://help.autodesk.com/view/MAXDEV/2022/ENU/?guid=Max_Developer_Help_3ds_max_sdk_features_rendering_programming_hardware_shaders_shader_semantics_and_annotations_supported_hlsl_shader_annotation_html
    */
    protected addControl(ctx: ContextT, src: IVariableDeclInstruction): boolean {
        if (!src.annotation) {
            return false; //TODO: controls without annotations
        }

        if (!src.isGlobal()) {
            return false;
        }
        
        let control: IUIControl = { name: src.id.name, type: src.type.name, value: null, properties: [] };

        if (src.annotation) {
            src.annotation.decls.forEach(decl => {
                let propertyName = decl.name;
                let propertyType = decl.type.name;

                if (decl.initExpr.args.length !== 1) {
                    return;
                }

                switch (propertyName) {
                    case 'UIType': propertyName = '__type'; break;
                    case 'UIName': propertyName = '__caption'; break;
                    case 'UIMin': propertyName = '__min'; break;
                    case 'UIMax': propertyName = '__max'; break;
                    case 'UIStep': propertyName = '__step'; break;
                }

                let propertyValue = getPropertyValue(propertyType, decl.initExpr.args[0]);
                if (['__min', '__max', '__step'].indexOf(propertyName) !== -1) {
                    if (propertyType === 'float' && control.type === 'float' ||
                        propertyType === 'int' && control.type === 'int' ||
                        propertyType === 'uint' && control.type === 'uint') {
                        control.properties.push({ name: propertyName, type: propertyType, value: propertyValue });
                    }
                }
                else {
                    if (propertyName === '__type' && propertyType !== 'string') {
                        return;
                    }
                    if (propertyName === '__type' && propertyValue === 'color') {
                        control.type = 'color';
                        return;
                    }
                    control.properties.push({ name: propertyName, type: propertyType, value: propertyValue });
                }
            });
        }

        control.value = getControlValue(control.type, src.initExpr?.args);
        ctx.addControl(control);
        return true;
    }


    protected trimeshBaseName(name: string) {
        return `trim${name[0].toUpperCase()}${name.slice(1)}`;
    }


    protected isTrimesh(type: IVariableTypeInstruction): boolean {
        const TRIMESH_NAME = 'TriMesh';
        return !!type?.name.includes(TRIMESH_NAME);
    }


    protected emitTrimeshDecl(ctx: ContextT, decl: IVariableDeclInstruction): void {
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
        const indicesAdjName = `${baseName}GsAdjacency`;
        const faceAdjName = `${baseName}FaceAdjacency`;
        
        const { typeName: elementTypeName } = this.resolveType(ctx, elementType);

        const vertices = this.emitBuffer(ctx, `StructuredBuffer<${elementTypeName}>`, verticesName, "vertices");
        const faces = this.emitBuffer(ctx, `Buffer<uint3>`, facesName, "faces");
        const indicesAdj = this.emitBuffer(ctx, `Buffer<uint>`, indicesAdjName, "gs like adjacency");
        const faceAdj = this.emitBuffer(ctx, `Buffer<uint>`, faceAdjName, "face adjacency");
        
        if (!ctx.has(name)) {
            // uniform uint trimesh0_vert_count;
            // uniform uint trimesh0_face_count;
            // StructuredBuffer<Vert> trimesh0_vert;
            // Buffer<uint3> trimesh0_faces;
            // Buffer<uint> trimesh0_faces_adj;

            if (ctx.opts.globalUniformsGatherToDedicatedConstantBuffer) {
                ctx.addUniform({ name: vertexCountUName, typeName: 'uint' });
            } else {
                this.emitGlobalRaw(ctx, vertexCountUName, `uniform uint ${vertexCountUName}`);
            }

            if (ctx.opts.globalUniformsGatherToDedicatedConstantBuffer) {
                ctx.addUniform({ name: faceCountUName, typeName: 'uint' });
            } else {
                this.emitGlobalRaw(ctx, faceCountUName, `uniform uint ${faceCountUName}`);
            }
            
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
                this.emitLine(`vertices[0] = ${indicesAdjName}[offset];`);
                this.emitLine(`vertices[1] = ${indicesAdjName}[offset + 1];`);
                this.emitLine(`vertices[2] = ${indicesAdjName}[offset + 2];`);
                this.emitLine(`vertices[3] = ${indicesAdjName}[offset + 3];`);
                this.emitLine(`vertices[4] = ${indicesAdjName}[offset + 4];`);
                this.emitLine(`vertices[5] = ${indicesAdjName}[offset + 5];`);
            }
            this.pop();
            this.emitChar('}');


            this.emitLine(`void ${baseName}_LoadFaceAdjacency(uint face, out uint faces[3])`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint offset = face * 3u;`);
                this.emitLine(`faces[0] = ${faceAdjName}[offset];`);
                this.emitLine(`faces[1] = ${faceAdjName}[offset + 1];`);
                this.emitLine(`faces[2] = ${faceAdjName}[offset + 2];`);
            }
            this.pop();
            this.emitChar('}');


            this.end();

            // let resourcePath = null;
            // let resource = decl.annotation.decls.find(({ name }) => name == 'resource');
            // if (resource && resource.type.name == 'string') {
            //     // '<this>' resource value means "this" resource
            //     resourcePath = (resource.initExpr.args[0] as StringInstruction).value.slice(1, -1); // remove quotes
            // }

            const mesh = {
                name,

                vertexCountUName,
                faceCountUName,

                verticesName,
                facesName,
                indicesAdjName,
                faceAdjName
            };

            ctx.addTrimesh(mesh);

            let value = (decl.annotation.decls.find(({ name }) => (name == 'name' || name == 'ResourceName'))
                ?.initExpr
                ?.args[0] as StringInstruction)?.value;
            value = value?.slice(1, -1) || null;
            const control: IUIControl = { name, type: 'mesh', value, properties: [] };
            ctx.addControl(control);
        }

        ctx.linkTrimesh(name);
    }


    emitTriMeshCall(ctx: ContextT, call: IFunctionCallInstruction) {
        switch (call.decl.name) {
            case 'LoadFace':
            case 'LoadVertex':
            case 'LoadGSAdjacency':
            case 'LoadFaceAdjacency':
            case 'GetDimensions':
                {
                    // note: it makes imporsible to pass tri meshes as function arguments
                    assert(call.callee.instructionType === EInstructionTypes.k_IdExpr);
                    const id = <IIdExprInstruction>call.callee;

                    this.emitGlobalVariable(ctx, id.decl);

                    this.emitKeyword(`${this.trimeshBaseName(id.name)}_${call.decl.name}`);
                    this.emitNoSpace();
                    this.emitChar('(');
                    this.emitNoSpace();
                    this.emitExpressionList(ctx, call.args);
                    this.emitChar(')');
                }
                break;
            default:
                assert(false);
        }
    }


    emitFCall(ctx: ContextT, call: IFunctionCallInstruction, rename?) {
        if (this.isTrimesh(call.callee?.type)) {
            this.emitTriMeshCall(ctx, call);
            return;
        }

        super.emitFCall(ctx, call, rename);
    }


    emitGlobalVariable(ctx: ContextT, decl: IVariableDeclInstruction) {
        if (this.isTrimesh(decl.type)) {
            this.emitTrimeshDecl(ctx, decl);
            return;
        }

        super.emitGlobalVariable(ctx, decl);
    }


    protected emitControlVariable(ctx: ContextT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string) {
        if (!ctx.opts.uiControlsGatherToDedicatedConstantBuffer) {
            // quick way to promote uniform qualifier to GLSL code
            (this.emitKeyword('uniform'), this.emitVariableNoInit(ctx, decl, rename));
        }
    }


    protected emitUniformVariable(ctx: ContextT, decl: IVariableDeclInstruction) {
        const KNOWN_EXTERNAL_GLOBALS = [
            'ELAPSED_TIME',
            'ELAPSED_TIME_LEVEL',
            'FRAME_NUMBER',

            'PARENT_POSITION',
            'CAMERA_POSITION'
        ];

        const semantic = decl.semantic || camelToSnakeCase(decl.name).toUpperCase();

        if (!KNOWN_EXTERNAL_GLOBALS.includes(semantic)) {
            super.emitVariable(ctx, decl);
            console.warn(`Unsupported uniform has been used: ${decl.toCode()}.`);
            return;
        }

        const isGlobal = true; // global update required
        const isLocal = false; // per object update required

        if (!ctx.opts.globalUniformsGatherToDedicatedConstantBuffer && isGlobal) {
            super.emitVariable(ctx, decl);
            return;
        }

        if (isGlobal) {
            let { name, semantic, type: { name: typeName, length } } = decl;
            if (!decl.type.isNotBaseArray()) length = -1;
            const uniform = { name, semantic, typeName, length };
            ctx.addUniform(uniform);
        }
    }


    // todo: remove hack with rename mutator
    emitVariable(ctx: ContextT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string) {
        if (this.addControl(ctx, decl)) {
            this.emitControlVariable(ctx, decl, rename);
            return;
        }

        if (decl.type.isUniform()) {
            this.emitUniformVariable(ctx, decl);
            return;
        }

        super.emitVariable(ctx, decl, rename);
    }


    emitTexture(ctx: ContextT, decl: IVariableDeclInstruction): void {
        const { name, type } = decl;

        if (!ctx.has(name)) {
            let value = (decl.annotation?.decls.find(({ name }) => (name == 'name' || name == 'ResourceName'))
                ?.initExpr
                ?.args[0] as StringInstruction)?.value;
            value = value?.slice(1, -1) || null;
            const control = <IUIControl>{ name, type: 'texture2d', value, properties: [] };
            ctx.addControl(control);
        }

        super.emitTexture(ctx, decl);
    }


    protected emitSpawnStmt(ctx: ContextT, stmt: ISpawnStmtInstruction) {
        const fx = <IPartFxInstruction>ctx.tech();

        // looking for:
        // Init(out Part part, int partId: PART_ID, int spawnId: SPAWN_ID, ...parameters)
        // Init(out Part part, int partId: PART_ID, ...parameters)
        // Init(out Part part, ...parameters)
        let argsList = [[/u?int/, /u?int/], [/u?int/], []]
            .map(v => [ fx.particle, ...v, ...stmt.args.map(a => a.type) ]);

        let init = null;
        for (const args of argsList) {
            init = stmt.scope.findFunction(stmt.name, args);
            if (init) {
                break;
            }
        }

        if (!init) {
            for (const args of argsList) {
                console.error(`could not find spawn inititalizer: ${stmt.name}(${args.map(a => `${a}`).join(', ')})`);
            }
            return;
        }


        if (!ctx.has(init.name)) {
            ctx.addSpawnCtor(init);

            const guid = ctx.spawners.indexOf(init) + 1;
            this.emitSpawnOperator(ctx, guid, init);
        }

        const guid = ctx.spawners.indexOf(init) + 1;

        this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitKeyword(`(uint)`);
        this.emitNoSpace();
        this.emitChar('(');
        this.emitExpression(ctx, stmt.count);
        this.emitChar(')');
        if (stmt.args.length) {
            this.emitChar(',');
            this.emitExpressionList(ctx, stmt.args);
        }
        this.emitChar(')');
        this.emitChar(';');
        this.emitNewline();

        // super.emitSpawnStmt(stmt);
    }


    protected emitDrawStmt(ctx: ContextT, { name, args }: IDrawStmtInstruction) {
        const fx = <IPartFxInstruction>ctx.tech();//<IPartFxInstruction>pass.parent;
        const pass = fx.passList.find(pass => pass.name == name);

        if (!pass) {
            console.warn(`pass<${name}> for draw operator has not been found.`);
            return;
        }

        const i = fx.passList.indexOf(pass);

        if (!ctx.has(name)) {
            ctx.add(name);

            const prerenderFn = pass.prerenderRoutine.function;
            this.emitFunction(ctx, prerenderFn);
            this.emitPrerenderRoutune(ctx, pass, i);
        }
        this.emitKeyword(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}`);
        this.emitChar(`(`);
        this.emitNoSpace();
        this.emitExpressionList(ctx, args);
        this.emitChar(`)`);
        this.emitChar(';');
        this.emitNewline();
    }


    protected emitResetShader(ctx: ContextT) {
        const name = FxTranslator.CS_PARTICLE_RESET_ROUTINE;
        const numthreads = [64, 1, 1];
        const fx = <IPartFxInstruction>ctx.tech();
        const capacity = fx.capacity;

        ctx.beginCsShader(name, numthreads);

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint tid = DTid.x;`);
                this.emitLine(`if (tid >= ${capacity}) return;`);

                this.emitUav(ctx, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION);
                this.emitLine(`${FxTranslator.UAV_DEAD_INDICES}[tid] = tid;`);

                this.emitUav(ctx, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION);
                this.emitLine(`${FxTranslator.UAV_STATES}[tid] = 0;`);

                const { typeName: partType } = this.resolveType(ctx, fx.particle);
                this.emitUav(ctx, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION);
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
                        this.emitUav(ctx, `RWStructuredBuffer<${p0.type.name}>`,
                            `${FxTranslator.UAV_SPAWN_EMITTER}`, FxTranslator.UAV_SPAWN_EMITTER_DESCRIPTION);

                        this.emitLine(`${p0.type.name} ${p0.name};`);
                        if (p0.type.isComplex()) {
                            for (const field of p0.type.fields) {
                                if (field.type.isComplex()) {
                                    // todo: add support
                                    continue;
                                }

                                if (field.initExpr) {
                                    this.emitKeyword(`${p0.name}.${field.name} =`);
                                    this.emitExpression(ctx, field.initExpr);
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
        ctx.endCsShader();
    }


    // TOOD: sync groupSize with value used inside the emitInitShader();
    protected emitSpawnOperator(ctx: ContextT, guid: number, ctor: IFunctionDeclInstruction, groupSize: number = 64) {
        this.begin();
        {
            this.emitKeyword('void');
            this.emitKeyword(`${FxTranslator.SPAWN_OPERATOR_POLYFILL_NAME}${guid}__`);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitKeyword(`uint nPart`);

            const optParams = [
                { name: `Particle`, checker: () => true }, // always presented
                { name: `PartId`, checker: isPartId },
                { name: `SpawnId`, checker: isSpawnId }
            ];

            let optArgs = [];

            if (ctor) {
                optArgs = resolveOptArguments(optParams, ctor.def);

                if (ctor.def.params.length > optArgs.length) {
                    this.emitChar(',');
                    this.emitParams(ctx, ctor.def.params.slice(optArgs.length));
                }
            }

            this.emitChar(')');
            this.emitNewline();
            this.emitChar('{');
            this.push();
            {
                this.emitUav(ctx, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
                    FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION);
                this.emitUav(ctx, `RWBuffer<uint>`,
                    FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION);

                this.emitLine(`int nGroups = (int)ceil((float)nPart / ${groupSize}.f);`);
                this.emitLine(`uint RequestId;`);
                this.emitLine(`// layout: [ uint GroupCountX, uint GroupCountY, uint GroupCountZ ]`);
                this.emitLine(`InterlockedAdd(${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0], nGroups, RequestId);`);
                this.emitLine(`for (int i = 0; i < nGroups; ++i)`);
                this.emitChar(`{`);
                this.push();
                {
                    // params
                    const request = `${FxTranslator.UAV_CREATION_REQUESTS}[RequestId]`;
                    this.emitLine(`${request}.count = min(nPart, ${groupSize}u);`);
                    this.emitLine(`${request}.offset = ${groupSize}u * i;`);
                    this.emitLine(`${request}.type = ${guid}u;`);

                    if (ctor) {
                        const params = ctor.def.params;
                        let nfloat = 0;
                        // skip first two arguments
                        params.slice(optArgs.length).forEach(param => {
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

                    this.emitLine(`nPart -= ${groupSize}u;`);
                    this.emitLine(`RequestId += 1;`);
                }
                this.pop();
                this.emitChar(`}`);
            }
            this.pop();
            this.emitChar('}');

        }
        this.end();
    }


    protected emitGlobalRaw(ctx: ContextT, name: string, content: string) {
        if (ctx.has(name)) {
            return;
        }
        ctx.add(name);
        this.begin();
        this.emitChar(`${content};`);
        this.end();
    }


    protected emitSpawnShader(ctx: ContextT) {
        const fx = <IPartFxInstruction>ctx.tech();
        if (!fx.spawnRoutine) {
            return null;
        }

        const spawnFn = fx.spawnRoutine.function;
        const elapsedTime = fx.scope.findVariable('elapsedTime');

        const name = FxTranslator.CS_PARTICLE_SPAWN_ROUTINE;
        const numthreads = [1, 1, 1];


        ctx.beginCsShader(name, numthreads);

        this.emitUav(ctx, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
            FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION);
        this.emitUav(ctx, `RWBuffer<uint>`,
            FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION);

        if (fx.initRoutine) {
            // default spawn op needed only if regulat emission is used
            this.emitSpawnOperator(ctx, 0, null);
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
                this.emitFunction(ctx, spawnFn);

                if (elapsedTime) {
                    this.emitGlobal(ctx, elapsedTime);
                } else {
                    // IP: remove this hack
                    this.emitGlobalRaw(ctx, 'elapsedTime', 'uniform float elapsedTime');
                }

                // todo: move to dispatch arguments reset routine
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[0] = 0u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[1] = 1u;`);
                this.emitLine(`${FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS}[2] = 1u;`);

                if (types.equals(spawnFn.def.returnType, T_VOID)) {
                    if (spawnFn.def.params.length == 1) {
                        const p0 = spawnFn.def.params[0];

                        this.emitUav(ctx, `RWStructuredBuffer<${p0.type.name}>`,
                            `${FxTranslator.UAV_SPAWN_EMITTER}`, FxTranslator.UAV_SPAWN_EMITTER_DESCRIPTION);

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
                    assert(types.equals(spawnFn.def.returnType, T_INT));

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

        ctx.endCsShader();
    }


    protected emitInitShader(ctx: ContextT) {
        const fx = <IPartFxInstruction>ctx.tech();
        const initFn = fx.initRoutine?.function;

        const name = FxTranslator.CS_PARTICLE_INIT_ROUTINE;
        const numthreads = [64, 1, 1];

        ctx.beginCsShader(name, numthreads);

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
                this.emitUav(ctx, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`, FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION);
                this.emitLine(`uint nPart = ${FxTranslator.UAV_CREATION_REQUESTS}[GroupId].count;`);
                this.emitNewline();
                this.emitLine(`if (ThreadId >= nPart) return;`);
                this.emitNewline();
                this.emitUav(ctx, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION);
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

                const { typeName: partType } = this.resolveType(ctx, fx.particle);
                this.emitUav(ctx, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION);
                this.emitLine(`${partType} Particle;`);

                // it's ok if here is no init function found
                // it means that generic spawner is used
                if (initFn) {
                    this.emitFunction(ctx, initFn);
                }

                const request = `${FxTranslator.UAV_CREATION_REQUESTS}[GroupId]`;

                this.emitLine(`uint Type = ${request}.type;`);
                this.emitLine(`uint SpawnId = ${request}.offset + ThreadId;`);
  
                const optParams = [
                    { name: `Particle`, checker: () => true }, // always presented
                    { name: `PartId`, checker: isPartId },
                    { name: `SpawnId`, checker: isSpawnId }
                ];

                if (initFn) {
                    const optArgs = resolveOptArguments(optParams, initFn.def);
                
                    this.emitLine(`if (Type == 0u)`);
                    this.emitChar('{');
                    this.push();
                    {
                        this.emitLine(`${initFn.name}(${optArgs.join(', ')});`);
                    }
                    this.pop();
                    this.emitChar('}');
                    this.emitNewline();
                }

                ctx.spawners.forEach((ctor, i) => {
                    this.emitFunction(ctx, ctor);

                    if (initFn || i > 0) {
                        this.emitKeyword(`else`);
                        this.emitSpace();
                    }

                    this.emitLine(`if (Type == ${i + 1}u)`);
                    this.emitChar('{');
                    this.push();
                    {
                        const optArgs = resolveOptArguments(optParams, ctor.def);
                        
                        // TODO: move param unpacking to separate function
                        // unpack arguments
                        let nfloat = 0;
                        let params = ctor.def.params.slice(optArgs.length);
                        params.forEach(param => {
                            this.emitVariable(ctx, param);
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
                        
                        this.emitKeyword(optArgs.join(', '));

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
                this.emitUav(ctx, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION);
                this.emitLine(`${FxTranslator.UAV_STATES}[PartId] = 1;`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        ctx.endCsShader();
    }


    protected emitUpdateShader(ctx: ContextT) {
        const fx = <IPartFxInstruction>ctx.tech();
        const updateFn = fx.updateRoutine.function;

        const name = FxTranslator.CS_PARTICLE_UPDATE_ROUTINE;
        const numthreads = [64, 1, 1];

        ctx.beginCsShader(name, numthreads);

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                this.emitUav(ctx, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION);
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                const { typeName: partType } = this.resolveType(ctx, fx.particle);
                this.emitUav(ctx, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION);
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);
                this.emitNewline();

                this.emitFunction(ctx, updateFn);

                this.emitLine(`[branch]`);
                this.emitLine(`if (!${updateFn.name}(Particle${updateFn.def.params.length > 1 ? ', PartId' : ''}))`);
                this.emitChar('{');
                this.push();
                {
                    this.emitUav(ctx, `RWStructuredBuffer<uint>`, FxTranslator.UAV_DEAD_INDICES, FxTranslator.UAV_DEAD_INDICES_DESCRIPTION);
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

        this.emitUav(ctx, `RWStructuredBuffer<${FxTranslator.SPAWN_OPERATOR_TYPE}>`,
            FxTranslator.UAV_CREATION_REQUESTS, FxTranslator.UAV_CREATION_REQUESTS_DESCRIPTION);
        this.emitUav(ctx, `RWBuffer<uint>`,
            FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS, FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS_DESCRIPTION);

        ctx.endCsShader();
    }


    protected emitPrerenderRoutune(ctx: ContextT, pass: IPartFxPassInstruction, i: number) {
        const fx = <IPartFxInstruction>ctx.tech();
        const prerenderFn = pass.prerenderRoutine.function;
        const { typeName: prerenderedType } = this.resolveType(ctx, prerenderFn.def.params[1].type);
        const { typeName: partType } = this.resolveType(ctx, fx.particle);
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
                this.emitUav(ctx, `RWStructuredBuffer<${prerenderedType}>`, `${FxTranslator.UAV_PRERENDERED}${i}`);

                if (pass.sorting) {
                    this.emitUav(ctx, `RWStructuredBuffer<int2>`, `${FxTranslator.UAV_SERIALS}${i}`, FxTranslator.UAV_SERIALS_DESCRIPTION);
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

                    if (types.equals(prerenderFn.def.returnType, T_VOID)) {
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


    protected emitPrerenderShader(ctx: ContextT, pass: IPartFxPassInstruction, i: number) {
        const prerenderFn = pass.prerenderRoutine.function;

        const name = `${FxTranslator.CS_PARTICLE_PRERENDER_SHADER}${i}`;
        const numthreads = [64, 1, 1];
        const fx = <IPartFxInstruction>ctx.tech();

        ctx.beginCsShader(name, numthreads);

        this.begin();
        {
            this.emitLine(`[numthreads(${numthreads.join(', ')})]`);
            this.emitLine(`void ${name}(uint3 Gid: SV_GroupID, uint GI: SV_GroupIndex, uint3 GTid: SV_GroupThreadID, uint3 DTid: SV_DispatchThreadID)`);
            this.emitChar('{');
            this.push();
            {
                this.emitLine(`uint PartId = DTid.x;`);
                this.emitUav(ctx, `RWBuffer<uint>`, FxTranslator.UAV_STATES, FxTranslator.UAV_STATES_DESCRIPTION);
                this.emitLine(`bool Alive = (bool)${FxTranslator.UAV_STATES}[PartId];`);
                this.emitNewline();
                this.emitLine(`[branch]`);
                this.emitLine(`if(!Alive) return;`);
                this.emitNewline();

                this.emitFunction(ctx, prerenderFn);

                const { typeName: partType } = this.resolveType(ctx, fx.particle);
                this.emitUav(ctx, `RWStructuredBuffer<${partType}>`, FxTranslator.UAV_PARTICLES, FxTranslator.UAV_PARTICLES_DESCRIPTION);
                this.emitLine(`${partType} Particle = ${FxTranslator.UAV_PARTICLES}[PartId];`);

                this.emitPrerenderRoutune(ctx, pass, i);
                this.emitLine(`${FxTranslator.DRAW_OPERATOR_POLYFILL_NAME}${i}(Particle);`);
            }
            this.pop();
            this.emitChar('}');
        }
        this.end();

        ctx.endCsShader();
    }


    protected emitSpawnOpContainer(ctx: ContextT) {
        const payloadSize = ctx.spawners.map(
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
                this.emitLine(`uint count;      // number of particles inside group`);
                this.emitLine(`uint offset;     // number of particles prior this group (to determ spawn id)`);
                this.emitLine(`uint type;       // type of spawner (type of function to init)`);

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


    protected finalizeTechnique(ctx: ContextT) {
        if (ctx.opts.globalUniformsGatherToDedicatedConstantBuffer) {
            const index = ctx.opts.globalUniformsConstantBufferRegister || -1;

            // check that no one uses the same register
            for (let name in ctx.tech().scope.cbuffers) {
                let cbuf = ctx.tech().scope.cbuffers[name];
                if (SystemScope.resolveRegister(cbuf).index === index) {
                    console.error(`register ${index} is already used by cbuffer '${cbuf.name}'`);
                }
            }

            const name = ctx.opts.globalUniformsConstantBufferName || 'GLOBAL_UNIFORMS';
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
                    ctx.uniforms.forEach(({ name, typeName, semantic, length }) => {
                        this.emitKeyword(typeName);
                        this.emitKeyword(name);
                        if (length > 0) {
                            this.emitChar(`[${length}]`);
                        }
                        if (semantic) {
                            this.emitSemantic(ctx, semantic);
                        } else {
                            this.emitSemantic(ctx, camelToSnakeCase(name).toUpperCase());
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

        if (ctx.opts.uiControlsGatherToDedicatedConstantBuffer) {
            const index = ctx.opts.uiControlsConstantBufferRegister || -1;

            // check that no one uses the same register
            for (let name in ctx.tech().scope.cbuffers) {
                let cbuf = ctx.tech().scope.cbuffers[name];
                if (SystemScope.resolveRegister(cbuf).index === index) {
                    console.error(`register ${index} is already used by cbuffer '${cbuf.name}'`);
                }
            }

            const name = ctx.opts.uiControlsConstantBufferName || 'AUTOGEN_CONTROLS';
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
                    ctx.controls.forEach(ctrl => {
                        if (ctrl.type === 'texture2d') return;
                        if (ctrl.type === 'mesh') return;
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


    emitPartFxDecl(ctx: ContextT, fx: IPartFxInstruction): void {
        if (!fx.particle) {
            return;
        }

        // note: only one effect can be translated at a time 
        ctx.beginTechnique(fx);

        this.emitSpawnShader(ctx);
        this.emitResetShader(ctx);

        if (fx.updateRoutine) {
            this.emitUpdateShader(ctx);
        }

        this.emitInitShader(ctx);

        const passes = fx.passList.map((pass, i): IPartFxPassReflection => {
            const { prerenderRoutine, vertexShader: vs, pixelShader: ps, drawMode } = pass;
            let { sorting, geometry, instanceCount } = pass;
            let VSParticleShader: string = null;
            let PSParticleShader: string = null;
            let renderStates = pass.renderStates;

            if (prerenderRoutine && drawMode === EPassDrawMode.k_Auto) {
                this.emitPrerenderShader(ctx, pass, i);
            }

            if (vs) {
                this.emitFunction(ctx, vs);
                VSParticleShader = vs.name;
            }

            if (ps) {
                this.emitFunction(ctx, ps);
                PSParticleShader = ps.name;
            }

            const { typeName: instance } = this.resolveType(ctx, pass.particleInstance);
            const CSParticlesPrerenderRoutine = ctx.CSShaders.find(sh => sh.name == `${FxTranslator.CS_PARTICLE_PRERENDER_SHADER}${i}`);

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

        this.emitSpawnOpContainer(ctx);
        this.finalizeTechnique(ctx);

        const { name, capacity } = fx;
        const particle = this.resolveType(ctx, fx.particle).typeName;
        const CSParticlesSpawnRoutine = ctx.CSShaders.find(sh => sh.name == FxTranslator.CS_PARTICLE_SPAWN_ROUTINE);
        const CSParticlesResetRoutine = ctx.CSShaders.find(sh => sh.name == FxTranslator.CS_PARTICLE_RESET_ROUTINE);
        const CSParticlesUpdateRoutine = ctx.CSShaders.find(sh => sh.name == FxTranslator.CS_PARTICLE_UPDATE_ROUTINE);;
        const CSParticlesInitRoutine = ctx.CSShaders.find(sh => sh.name == FxTranslator.CS_PARTICLE_INIT_ROUTINE);;
        const controls = [...ctx.controls];
        const presets = FxTranslator.parsePresets(fx);

        const pfx: IPartFxReflection = {
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

        ctx.addTechnique(pfx);
        ctx.endTechnique();
    }


    emitTechniqueDecl(ctx: ContextT, tech: ITechniqueInstruction): void {
        // note: only one effect can be tranclated at a time 
        ctx.beginTechnique(tech);

        const { name } = tech;

        tech.passList.forEach((pass, i) => {
            const { vertexShader: vs, pixelShader: ps } = pass;
            if (vs) {
                this.emitFunction(ctx, vs);
            }
            if (ps) {
                this.emitFunction(ctx, ps);
            }
        });

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
            const { typeName: instance } = this.resolveType(ctx, matInstance);

            const renderStates = pass.renderStates;

            return {
                instance,
                VSParticleShader,
                PSParticleShader,
                renderStates
            };
        });

        // emit global uniforms and so on.
        this.finalizeTechnique(ctx);

        const controls = [...ctx.controls];
        const presets = FxTranslator.parsePresets(tech);
        const refl = {
            name,
            passes,
            controls,
            presets
        };

        ctx.addTechnique(refl);
        ctx.endTechnique();
    }


    emitTechnique11Decl(ctx: ContextT, tech: ITechnique11Instruction): void {
        // note: only one effect can be tranclated at a time 
        ctx.beginTechnique(tech);

        const { name } = tech;

        // emit global uniforms and so on.
        this.finalizeTechnique(ctx);

        const refl = {
            name
        };

        ctx.addTechnique11(refl);
        ctx.endTechnique();
    }


    static parsePresets(fx: ITechniqueInstruction): IPreset[] {
        return fx.presets.map((preset, i): IPreset => {
            const name = preset.name;
            const desc = null; // todo
            let data: IPresetEntry[] = [];
            preset.props.forEach(control => {
                if (!control) {
                    //FIX: In a case when the set of controls has changed, but the preset has remained the same.
                    return;
                }

                const src = control.resolveDeclaration();
                let controlType = src.type.name.toLowerCase(); // Texture2D => texture2d
                if (src.annotation) {
                    src.annotation.decls.forEach(prop => {
                        let propertyName = prop.name;
                        let propertyType = prop.type.name;

                        if (prop.initExpr.args.length !== 1) {
                            return;
                        }

                        let propertyValue = getPropertyValue(propertyType, prop.initExpr.args[0]);
                        if ((propertyName === '__type' || propertyName === 'UIType') &&
                            propertyType === 'string' && propertyValue === 'color') {
                            controlType = 'color';
                            return;
                        }
                    });
                }

                const value = getControlValue(controlType, control.args);
                data.push({ name: src.name, type: controlType, value });
            });
            return { name, desc, data };
        });
    }


    private static fxtTranslator = new FxTranslator({ omitEmptyParams: true });


    static translate(fx: ITechniqueInstruction, ctx: FxTranslatorContext = new FxTranslatorContext): string {
        switch (fx.instructionType) {
            case EInstructionTypes.k_PartFxDecl:
                FxTranslator.fxtTranslator.emitPartFxDecl(ctx, <IPartFxInstruction>fx);
                break;
            case EInstructionTypes.k_TechniqueDecl:
                FxTranslator.fxtTranslator.emitTechniqueDecl(ctx, fx);
                break;
            default:
                console.assert(false);
        }
        return FxTranslator.fxtTranslator.toString(ctx);
    }

    static translate11(fx: ITechnique11Instruction, ctx: FxTranslatorContext = new FxTranslatorContext): string {
        FxTranslator.fxtTranslator.emitTechnique11Decl(ctx, fx);
        return FxTranslator.fxtTranslator.toString(ctx);
    }

    static translateDebug(instr: IInstruction, ctx: FxTranslatorContext = new FxTranslatorContext): string {
        FxTranslator.fxtTranslator.emit(ctx, instr);
        return FxTranslator.fxtTranslator.toString(ctx);
    }
}

function getPropertyValue(type: string, instr: IExprInstruction): PropertyValueType {
    instr = getExpr(instr);
    switch (type) {
        case 'int': return (instr as IntInstruction).value;
        case 'uint': return (instr as IntInstruction).value;
        case 'float': return (instr as FloatInstruction).value;
        // hack to remove quotes (should have been fixed during analyze stage)
        case 'string': return (instr as StringInstruction).value.split('"').join('');
    }
    assert(false, 'Unsupported type');
    return null;
}

function getControlValue(type: string, args: IExprInstruction[]): ControlValueType {
    switch (type) {
        case 'int': return (getExpr(args[0]) as IntInstruction).value;
        case 'uint': return (getExpr(args[0]) as IntInstruction).value;
        case 'float': return (getExpr(args[0]) as FloatInstruction).value;
        case 'float2': {
            let x = (getExpr(args[0]) as FloatInstruction).value;
            let y = (getExpr(args[1]) as FloatInstruction).value;
            return { x: x, y: y } as Vector2;
        }
        case 'float3': {
            let x = (getExpr(args[0]) as FloatInstruction).value;
            let y = (getExpr(args[1]) as FloatInstruction).value;
            let z = (getExpr(args[2]) as FloatInstruction).value;
            return { x: x, y: y, z: z } as Vector3;
        }
        case 'float4': {
            let x = (getExpr(args[0]) as FloatInstruction).value;
            let y = (getExpr(args[1]) as FloatInstruction).value;
            let z = (getExpr(args[2]) as FloatInstruction).value;
            let w = (getExpr(args[3]) as FloatInstruction).value;
            return { x: x, y: y, z: z, w: w } as Vector4;
        }
        case 'color': {
            let r = (getExpr(args[0]) as FloatInstruction).value;
            let g = (getExpr(args[1]) as FloatInstruction).value;
            let b = (getExpr(args[2]) as FloatInstruction).value;
            let a = (getExpr(args[3]) as FloatInstruction).value;
            return { r: r, g: g, b: b, a: a } as Color;
        }
        case 'texture2d': {
            // remove quotes
            return (getExpr(args[0]) as StringInstruction).value?.slice(1, -1) || null;
        }
    }
    return null;
}

function getExpr(expr: IExprInstruction): IExprInstruction {
    return expr.instructionType === EInstructionTypes.k_InitExpr
        ? ((expr as IInitExprInstruction).args[0])
        : (<ILiteralInstruction<number>>expr);
}
