import { assert, isString } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { FxTranslator, FxTranslatorContext, ICSShaderReflectionEx, IFxContextExOptions, IPartFxPassReflection, IPartFxReflection, IPassReflection, IPreset, IUIControl } from "@lib/fx/translators/FxTranslator";
import { GLSLContext, GLSLEmitter } from "@lib/fx/translators/GlslEmitter";
import { BufferBundleT, BundleContent, BundleMetaT, BundleSignatureT, BundleT, CBBundleT, EPartSimRoutines, GLSLAttributeT, MatBundleT, MatRenderPassT, PartBundleT, PartRenderPassT, PresetEntryT, PresetT, RenderStateT, RoutineBundle, RoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT, RoutineGLSLSourceBundleT, RoutineHLSLSourceBundleT, RoutineShaderBundleT, RoutineSourceBundle, TextureBundleT, TrimeshBundleT, TypeFieldT, TypeLayoutT, UAVBundleT, UIControlT, ViewTypePropertyT } from "@lib/idl/bundles/FxBundle_generated";
import { EInstructionTypes, ITechniqueInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IncludeResolver } from "@lib/idl/parser/IParser";
import { EPassDrawMode, IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { IKnownDefine } from "@lib/parser/Preprocessor";
import { Diagnostics } from "@lib/util/Diagnostics";
import * as flatbuffers from 'flatbuffers';
import { createSLASTDocument } from "../SLASTDocument";
import { CodeConvolutionContext, CodeConvolutionEmitter, ICodeConvolutionContextOptions } from "../translators/CodeConvolutionEmitter";
import { encodeControlValue, encodePropertyValue, getFBControlType, getFBPropertyType } from "./utils";

export const PACKED = true;


// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleSignature(): BundleSignatureT {
    return new BundleSignatureT(MODE, VERSION, COMMITHASH, BRANCH, TIMESTAMP);
}


function createFxBundle(name: string, type: BundleContent, data: PartBundleT | MatBundleT, meta = new BundleMetaT, controls?: UIControlT[], presets?: PresetT[]): BundleT {
    const signature = getFxBundleSignature();
    return new BundleT(name, signature, meta, type, data, controls, presets);
}


function createPartFxRenderPass(slDocument: ISLDocument, reflection: IPartFxPassReflection, opts: BundleOptions = {}): PartRenderPassT {
    const scope = slDocument.root.scope;
    const { geometry, sorting, instanceCount, CSParticlesPrerenderRoutine, drawMode } = reflection;
    const prerender = drawMode == EPassDrawMode.k_Auto
        ? createFxRoutineBytecodeBundle(slDocument, CSParticlesPrerenderRoutine)
        : createFxRoutineNoBytecodeBundle(); // fill dummy routine for backward compartibility
    // create GLSL attribute based instance layout
    const partType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(partType);
    const vertex = createFxRoutineVsShaderBundle(slDocument, reflection.instance, reflection.VSParticleShader, opts);
    const pixel = createFxRoutinePsShaderBundle(slDocument, reflection.PSParticleShader, opts);
    const routineTypes = [RoutineBundle.RoutineBytecodeBundle, RoutineBundle.RoutineShaderBundle, RoutineBundle.RoutineShaderBundle];
    const routines = [prerender, vertex, pixel]; // must be aligned with EPartRenderRoutines
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return new PartRenderPassT(routineTypes, routines, geometry, sorting, instanceCount, stride, instance);
}


export class ConvolutionPackEx implements ICodeConvolutionContextOptions {
    defines?: IKnownDefine[];

    constructor(
        public textDocument?: ITextDocument,
        public slastDocument?: ISLASTDocument,
        public includeResolver?: IncludeResolver,
        defines?: (string | IKnownDefine)[]) {
        this.defines = defines?.map((name): IKnownDefine => isString(name) ? ({ name }) as IKnownDefine : name as IKnownDefine);
    }
}


function createMatFxRenderPass(slDocument: ISLDocument, reflection: IPassReflection, opts: BundleOptions = {}, convPack: ConvolutionPackEx = {}): MatRenderPassT {
    const scope = slDocument.root.scope;
    const vs = createFxRoutineVsShaderBundle(slDocument, reflection.instance, reflection.VSParticleShader, opts, convPack);
    const ps = createFxRoutinePsShaderBundle(slDocument, reflection.PSParticleShader, opts, convPack);
    const routineTypes = [RoutineBundle.RoutineShaderBundle, RoutineBundle.RoutineShaderBundle];
    const routines = [vs, ps]; // must be aligned with EMatRenderRoutines
    const vertexType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(vertexType);
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;
    const renderStates = Object.keys(reflection.renderStates).map(key => new RenderStateT(Number(key), Number(reflection.renderStates[key])));
    return new MatRenderPassT(routineTypes, routines, instance, stride, renderStates);
}


function createFxTypeLayout(type: ITypeInstruction): TypeLayoutT {
    return typeAstToTypeLayout(type);
}


function createFxRoutineNoBytecodeBundle(): RoutineBytecodeBundleT {
    return new RoutineBytecodeBundleT();
}


function createFxRoutineBytecodeBundle(slDocument: ISLDocument, reflection: ICSShaderReflectionEx): RoutineBytecodeBundleT {
    const entry = reflection.name;
    const shader = slDocument.root.scope.findFunction(entry, null);
    assert(shader);
    
    const numthreads = [...reflection.numthreads];
    const program = Bytecode.translate(shader);
    const code = program.code;
    const uavs = reflection.uavs.map(({ name, register: slot, elementType }) => {
        const typeInstr = slDocument.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = createFxTypeLayout(typeInstr);
        return new UAVBundleT(name, slot, stride, type);
    });
    const buffers = reflection.buffers.map(({ name, register: slot, elementType }) => {
        const typeInstr = slDocument.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = createFxTypeLayout(typeInstr);
        return new BufferBundleT(name, slot, stride, type);
    });
    const textures = reflection.textures.map(({ name, register: slot, elementType }) => {
        const typeInstr = slDocument.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = createFxTypeLayout(typeInstr);
        return new TextureBundleT(name, slot, stride, type);
    });

    const trimeshes = reflection.trimeshes.map(({ name, vertexCountUName, faceCountUName, verticesName, facesName, adjacencyName }) => {
        return new TrimeshBundleT(name, vertexCountUName, faceCountUName, verticesName, facesName, adjacencyName);
    });
    return new RoutineBytecodeBundleT(Array.from(code), new RoutineBytecodeBundleResourcesT(uavs, buffers, textures, trimeshes), numthreads);
}


function createFxRoutineVsGLSLBundle(slDocument: ISLDocument, interpolatorsType: string, entryName: string, { name }: BundleOptions = {}): RoutineGLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineGLSLSourceBundleT();
    }

    const partType = scope.findType(interpolatorsType);
    const instance = createFxTypeLayout(partType);

    const attributesGLSL = instance.fields.map(field => {
        let size = field.size >> 2;
        let offset = field.padding >> 2;
        let attrName = GLSLEmitter.$declToAttributeName(partType.getField(<string>field.name));
        return new GLSLAttributeT(size, offset, attrName);
    });

    const ctx = new GLSLContext({ mode: 'vertex' });
    const codeGLSL = GLSLEmitter.translate(fn, ctx); // raw hlsl

    const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
        const fields = scope.findCbuffer(name).type.fields.map(f => new TypeFieldT(createFxTypeLayout(f.type), f.name, f.semantic, f.type.size, f.type.padding));
        return new CBBundleT(name, register, size, fields);
    });

    return new RoutineGLSLSourceBundleT(codeGLSL, attributesGLSL, cbuffers);
}


function createFxRoutineVsHLSLBundle(slDocument: ISLDocument, entryName: string, { name }: BundleOptions = {}, { textDocument, slastDocument }: ConvolutionPackEx = {}): RoutineHLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineHLSLSourceBundleT();
    }
    // set entry point name according with bundle name
    const ctx = new CodeConvolutionContext({ textDocument, slastDocument, mode: 'vertex', entryName: name });
    const codeHLSL = CodeConvolutionEmitter.translate(fn, ctx); // raw hlsl

    const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
        const fields = scope.findCbuffer(name).type.fields.map(f => new TypeFieldT(createFxTypeLayout(f.type), f.name, f.semantic, f.type.size, f.type.padding));
        return new CBBundleT(name, register, size, fields);
    });

    return new RoutineHLSLSourceBundleT(codeHLSL, name, cbuffers);
}


function createFxRoutineVsShaderBundle(slDocument: ISLDocument, interpolatorsType: string, entryName: string, opts: BundleOptions = {}, convPack: ConvolutionPackEx = {}): RoutineShaderBundleT {
    const shaderType = [];
    const shaderBundles = [];

    if (!opts.omitGLSL) {
        shaderType.push(RoutineSourceBundle.RoutineGLSLSourceBundle);
        shaderBundles.push(createFxRoutineVsGLSLBundle(slDocument, interpolatorsType, entryName, opts));
    }

    if (!opts.omitHLSL) {
        shaderType.push(RoutineSourceBundle.RoutineHLSLSourceBundle);
        shaderBundles.push(createFxRoutineVsHLSLBundle(slDocument, entryName, opts, convPack));
    }

    return new RoutineShaderBundleT(shaderType, shaderBundles);
}


function createFxRoutinePsGLSLBundle(slDocument: ISLDocument, entryName: string, { name }: BundleOptions = {}): RoutineGLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineGLSLSourceBundleT();
    }

    // set entry point name according with bundle name
    const ctx = new GLSLContext({ mode: 'pixel' });
    const codeGLSL = GLSLEmitter.translate(fn, ctx); // raw hlsl

    const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
        const fields = scope.findCbuffer(name).type.fields.map(f => new TypeFieldT(createFxTypeLayout(f.type), f.name, f.semantic, f.type.size, f.type.padding));
        return new CBBundleT(name, register, size, fields);
    });

    return new RoutineGLSLSourceBundleT(codeGLSL, [], cbuffers);
}


function createFxRoutinePsHLSLBundle(slDocument: ISLDocument, entryName: string, { name }: BundleOptions = {}, { textDocument, slastDocument }: ConvolutionPackEx = {}): RoutineHLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineHLSLSourceBundleT();
    }

    // set entry point name according with bundle name
    const ctx = new CodeConvolutionContext({ textDocument, slastDocument, mode: 'pixel', entryName: name });
    const codeHLSL = CodeConvolutionEmitter.translate(fn, ctx); // raw hlsl

    const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
        const fields = scope.findCbuffer(name).type.fields.map(f => new TypeFieldT(createFxTypeLayout(f.type), f.name, f.semantic, f.type.size, f.type.padding));
        return new CBBundleT(name, register, size, fields);
    });

    return new RoutineHLSLSourceBundleT(codeHLSL, name, cbuffers);
}


function createFxRoutinePsShaderBundle(slDocument: ISLDocument, entryName: string, opts: BundleOptions = {}, convPack: ConvolutionPackEx = {}): RoutineShaderBundleT {
    const shaderType = [];
    const shaderBundles = [];

    if (!opts.omitGLSL) {
        shaderType.push(RoutineSourceBundle.RoutineGLSLSourceBundle);
        shaderBundles.push(createFxRoutinePsGLSLBundle(slDocument, entryName, opts));
    }

    if (!opts.omitHLSL) {
        shaderType.push(RoutineSourceBundle.RoutineHLSLSourceBundle);
        shaderBundles.push(createFxRoutinePsHLSLBundle(slDocument, entryName, opts, convPack));
    }

    return new RoutineShaderBundleT(shaderType, shaderBundles);
}



function createFxControls(controls: IUIControl[]): UIControlT[] {
    return controls.map(ctrl => {
        const props = ctrl.properties.map(prop => new ViewTypePropertyT(
            prop.name, 
            getFBPropertyType(prop.type), 
            encodePropertyValue(prop.type, prop.value)
        ));
        return new UIControlT(
            ctrl.name, 
            getFBControlType(ctrl.type), 
            encodeControlValue(ctrl.type, ctrl.value), 
            props);
    });
}


function createFxPresets(presets: IPreset[]): PresetT[] {
    return presets.map(
        ({ name, desc, data }) => new PresetT(
            name,
            desc,
            data.map(({ name, type, value }) => new PresetEntryT(
                name, 
                getFBControlType(type), 
                encodeControlValue(type, value)
            ))
        )
    );
}


export interface BundleOptions {
    packed?: boolean;
    meta?: {
        author: string;
        source: string;
    };
    omitHLSL?: boolean;
    omitGLSL?: boolean;
    name?: string;

    translator?: IFxContextExOptions;
}


function finalizeBundle(bundle: BundleT, opts: BundleOptions = {}): Uint8Array | BundleT {
    // get unpacked version
    // --------------------------------

    let { packed = PACKED } = opts;

    if (!packed)
        return bundle;

    // get packed version
    // --------------------------------

    let fbb = new flatbuffers.Builder();
    let end = bundle.pack(fbb);
    fbb.finish(end);

    return fbb.asUint8Array();
}


async function createPartFxBundle(fx: IPartFxInstruction, opts: BundleOptions = {}): Promise<Uint8Array | BundleT> {
    const ctx = new FxTranslatorContext({ ...opts.translator });
    const raw = FxTranslator.translate(fx, ctx); // raw hlsl

    const reflection = ctx.techniques[0] as IPartFxReflection;
    const { name, capacity } = reflection;

    opts.name ||= name;

    const textDocument = await createTextDocument('://raw', raw);
    const slDocument = await createSLDocument(textDocument);
    const scope = slDocument.root.scope;


    if (slDocument.diagnosticReport.errors) {
        console.error(Diagnostics.stringify(slDocument.diagnosticReport));
        return null;
    }

    const particle = createFxTypeLayout(scope.findType(reflection.particle));
    const routines = Array<RoutineShaderBundleT | RoutineBytecodeBundleT>(EPartSimRoutines.k_Last);
    const routineTypes = Array<RoutineBundle>(EPartSimRoutines.k_Last);

    routineTypes[EPartSimRoutines.k_Reset] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Reset] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesResetRoutine);

    routineTypes[EPartSimRoutines.k_Spawn] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Spawn] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesSpawnRoutine);

    routineTypes[EPartSimRoutines.k_Init] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Init] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesInitRoutine);

    routineTypes[EPartSimRoutines.k_Update] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Update] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesUpdateRoutine);

    const passes = reflection.passes.map(pass => createPartFxRenderPass(slDocument, pass, opts));
    const part = new PartBundleT(capacity, routineTypes, routines, passes, particle);

    const controls = createFxControls(reflection.controls);
    const presets = createFxPresets(reflection.presets);

    const { meta } = opts;
    const bundle = createFxBundle(opts.name, BundleContent.PartBundle, part, new BundleMetaT(meta?.author, meta?.source), controls, presets);

    return finalizeBundle(bundle, opts);
}


async function createMatFxBundle(tech: ITechniqueInstruction, opts: BundleOptions = {}, convPack: ConvolutionPackEx = {}): Promise<Uint8Array | BundleT> {
    const { includeResolver, defines } = convPack;
    
    const { textDocument, slastDocument } = convPack;
    const ctx = new FxTranslatorContext({ ...opts.translator, textDocument, slastDocument });
    const raw = FxTranslator.translate(tech, ctx);

    const reflection = ctx.techniques[0];
    const { name } = reflection;

    opts.name ||= name;

    const textDocument3 = await createTextDocument('file://foo.bar///mat.fx', raw);
    const slastDocument3 = await createSLASTDocument(textDocument3, { includeResolver, defines });
    const slDocument = await createSLDocument(slastDocument3);

    if (slDocument.diagnosticReport.errors) {
        console.error(Diagnostics.stringify(slDocument.diagnosticReport));
        return null;
    }

    const passes = reflection.passes.map(pass => createMatFxRenderPass(slDocument, pass, opts, new ConvolutionPackEx(textDocument3, slastDocument3, includeResolver, defines)));
    const mat = new MatBundleT(passes);

    const controls = createFxControls(reflection.controls);
    const presets = createFxPresets(reflection.presets);

    const { meta } = opts;
    const bundle = createFxBundle(opts.name, BundleContent.MatBundle, mat, new BundleMetaT(meta?.author, meta?.source), controls, presets);

    return finalizeBundle(bundle, opts);
}


export async function createBundle(fx: ITechniqueInstruction, options?: BundleOptions, convPack?: ConvolutionPackEx): Promise<Uint8Array | BundleT> {
    switch (fx.instructionType) {
        case EInstructionTypes.k_PartFxDecl:
            return createPartFxBundle(<IPartFxInstruction>fx, options);
        case EInstructionTypes.k_TechniqueDecl:
            return createMatFxBundle(fx, options, convPack);
    }
    console.assert(false);
    return null;
}
