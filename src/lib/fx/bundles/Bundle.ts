import * as Bytecode from "@lib/fx/bytecode/Bytecode";
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { CodeConvolutionContext, CodeConvolutionEmitter } from "@lib/fx/translators/CodeConvolutionEmitter";
import { FxTranslator, FxTranslatorContext, ICSShaderReflectionEx, IFxContextExOptions, IPartFxPassReflection, IPartFxReflection, IPassReflection, IPreset, IUIControl } from "@lib/fx/translators/FxTranslator";
import { GLSLContext, GLSLEmitter } from "@lib/fx/translators/GlslEmitter";
import { EInstructionTypes, ITechniqueInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { EPassDrawMode, IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { Diagnostics } from "@lib/util/Diagnostics";
import { controlValueFromString, ConvolutionPackEx, encodeControlValue, encodePropertyValue, propertyValueFromString } from "./utils";

import * as flatbuffers from "flatbuffers";

import { BufferBundleT } from "@lib/idl/bundles/auto/buffer-bundle";
import { CBBundleT } from "@lib/idl/bundles/auto/cbbundle";
import { BundleT } from "@lib/idl/bundles/auto/fx/bundle";
import { BundleContent } from "@lib/idl/bundles/auto/fx/bundle-content";
import { BundleMetaT } from "@lib/idl/bundles/auto/fx/bundle-meta";
import { BundleSignatureT } from "@lib/idl/bundles/auto/fx/bundle-signature";
import { EPartSimRoutines } from "@lib/idl/bundles/auto/fx/epart-sim-routines";
import { GLSLAttributeT } from "@lib/idl/bundles/auto/fx/glslattribute";
import { MatBundleT } from "@lib/idl/bundles/auto/fx/mat-bundle";
import { MatRenderPassT } from "@lib/idl/bundles/auto/fx/mat-render-pass";
import { PartBundleT } from "@lib/idl/bundles/auto/fx/part-bundle";
import { PartRenderPassT } from "@lib/idl/bundles/auto/fx/part-render-pass";
import { PresetT } from "@lib/idl/bundles/auto/fx/preset";
import { PresetEntryT } from "@lib/idl/bundles/auto/fx/preset-entry";
import { RenderStateT } from "@lib/idl/bundles/auto/fx/render-state";
import { RoutineBundle } from "@lib/idl/bundles/auto/fx/routine-bundle";
import { RoutineBytecodeBundleT } from "@lib/idl/bundles/auto/fx/routine-bytecode-bundle";
import { RoutineBytecodeBundleResourcesT } from "@lib/idl/bundles/auto/fx/routine-bytecode-bundle-resources";
import { RoutineGLSLSourceBundleT } from "@lib/idl/bundles/auto/fx/routine-glslsource-bundle";
import { RoutineHLSLSourceBundleT } from "@lib/idl/bundles/auto/fx/routine-hlslsource-bundle";
import { RoutineShaderBundleT } from "@lib/idl/bundles/auto/fx/routine-shader-bundle";
import { RoutineSourceBundle } from "@lib/idl/bundles/auto/fx/routine-source-bundle";
import { Technique11BundleT } from "@lib/idl/bundles/auto/fx/technique11bundle";
import { TrimeshBundleT } from "@lib/idl/bundles/auto/fx/trimesh-bundle";
import { UIControlT } from "@lib/idl/bundles/auto/fx/uicontrol";
import { ViewTypePropertyT } from "@lib/idl/bundles/auto/fx/view-type-property";
import { TextureBundleT } from "@lib/idl/bundles/auto/texture-bundle";
import { TypeFieldT } from "@lib/idl/bundles/auto/type-field";
import { TypeLayoutT } from "@lib/idl/bundles/auto/type-layout";
import { UAVBundleT } from "@lib/idl/bundles/auto/uavbundle";


export const PACKED = true;


// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function createFxBundleSignature(): BundleSignatureT {
    return new BundleSignatureT(MODE, VERSION, COMMITHASH, BRANCH, TIMESTAMP);
}


function createFxBundle(name: string, type: BundleContent, data: PartBundleT | MatBundleT | Technique11BundleT, meta = new BundleMetaT, controls?: UIControlT[], presets?: PresetT[]): BundleT {
    const signature = createFxBundleSignature();
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
    const renderStates = Object.keys(reflection.renderStates).map(key => new RenderStateT(Number(key), Number(reflection.renderStates[key])));
    return new PartRenderPassT(routineTypes, routines, geometry, sorting, instanceCount, stride, instance, renderStates);
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
    const numthreads = [...reflection.numthreads];
    const bcDocument = Bytecode.translate(slDocument, entry);

    if (bcDocument.diagnosticReport.errors) {
        // const content = CodeEmitter.translateDocument(slDocument);
        // const step = (y, x) => x > y ? 1 : 0;
        // const pad = (x) => Array(step(x, 1000) + step(x, 100) + step(x, 10)).fill(' ').join('') + x;
        // console.log(content.split('\n').map((line, i) => `${pad(i + 1)}. ${line}`).join('\n'));
        console.error(Diagnostics.stringify(bcDocument.diagnosticReport));
        alert('could not generate bytecode, see console log for details');
    }

    const code = bcDocument.program?.code;

    if (!code) {
        return new RoutineBytecodeBundleT();
    }

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

    const trimeshes = reflection.trimeshes.map(({ name, vertexCountUName, faceCountUName, verticesName, facesName, indicesAdjName, faceAdjName }) => {
        return new TrimeshBundleT(name, vertexCountUName, faceCountUName, verticesName, facesName, indicesAdjName, faceAdjName);
    });
    return new RoutineBytecodeBundleT(Array.from(code), new RoutineBytecodeBundleResourcesT(uavs, buffers, textures, trimeshes), numthreads);
}


// function createFxPass11BytecodeBundle(pass11: IPass11Instruction): Pass11BytecodeBundleT {

//     // todo: translate pass
//     return new Pass11BytecodeBundleT();
// }


function createFxRoutineVsGLSLBundle(slDocument: ISLDocument, interpolatorsType: string, entryName: string, { name }: BundleOptions = {}): RoutineGLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineGLSLSourceBundleT();
    }

    const partType = scope.findType(interpolatorsType);
    const instance = createFxTypeLayout(partType);

    const attrsGLSL = instance.fields.map(field => {
        let size = field.size >> 2;
        let offset = field.padding >> 2;
        let attrName = GLSLEmitter.$declToAttributeName(partType.getField(<string>field.name));
        return new GLSLAttributeT(size, offset, attrName);
    });

    const ctx = new GLSLContext({ mode: 'vs' });
    const codeGLSL = GLSLEmitter.translate(fn, ctx); // raw hlsl

    const cbuffers = ctx.cbuffers.map(({ name, register, size }) => {
        const fields = scope.findCbuffer(name).type.fields.map(f => new TypeFieldT(createFxTypeLayout(f.type), f.name, f.semantic, f.type.size, f.type.padding));
        return new CBBundleT(name, register, size, fields);
    });

    return new RoutineGLSLSourceBundleT(codeGLSL, attrsGLSL, cbuffers);
}


function createFxRoutineVsHLSLBundle(slDocument: ISLDocument, entryName: string, { name }: BundleOptions = {}, { textDocument, slastDocument }: ConvolutionPackEx = {}): RoutineHLSLSourceBundleT {
    const scope = slDocument.root.scope;
    const fn = scope.findFunction(entryName, null);

    if (!fn) {
        return new RoutineHLSLSourceBundleT();
    }
    // set entry point name according with bundle name
    const ctx = new CodeConvolutionContext({ textDocument, slastDocument, mode: 'vs', entryName: name });
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
    const ctx = new GLSLContext({ mode: 'ps' });
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
    const ctx = new CodeConvolutionContext({ textDocument, slastDocument, mode: 'ps', entryName: name });
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
            propertyValueFromString(prop.type), 
            encodePropertyValue(prop.type, prop.value)
        ));
        return new UIControlT(
            ctrl.name, 
            controlValueFromString(ctrl.type), 
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
                controlValueFromString(type), 
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



/** @deprecated */
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


