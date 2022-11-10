import { assert } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { ICSShaderReflection } from "@lib/fx/translators/CodeEmitter";
import { FxTranslator, IPartFxPassReflection, IPassReflection, IPreset, IUIControl } from "@lib/fx/translators/FxTranslator";
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import * as Hlsl from '@lib/fx/translators/CodeEmitter';
import { BundleContent, BundleMetaT, BundleSignatureT, BundleT, EPartSimRoutines, GLSLAttributeT, MatBundleT, MatRenderPassT, PartBundleT, PartRenderPassT, PresetEntryT, PresetT, RenderStateT, RoutineBundle, RoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT, RoutineGLSLSourceBundleT, RoutineHLSLSourceBundle, RoutineHLSLSourceBundleT, RoutineShaderBundleT, RoutineSourceBundle, TypeLayoutT, UAVBundleT, UIColorT, UIControlT, UIFloat3T, UIFloatSpinnerT, UIFloatT, UIIntT, UIProperties, UISpinnerT, UIUintT } from "@lib/idl/bundles/FxBundle_generated";
import { EInstructionTypes, ITechniqueInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { EPassDrawMode, IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { Diagnostics } from "@lib/util/Diagnostics";
import * as flatbuffers from 'flatbuffers';

export const PACKED = true;


// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleSignature(): BundleSignatureT {
    return new BundleSignatureT( MODE, VERSION, COMMITHASH, BRANCH, TIMESTAMP );
}
 

function createFxBundle(name: string, type: BundleContent, data: PartBundleT | MatBundleT, meta = new BundleMetaT, controls?: UIControlT[], presets?: PresetT[]): BundleT {
    const signature = getFxBundleSignature();
    return new BundleT(name, signature, meta, type, data, controls, presets);
}



function createPartFxRenderPass(document: ISLDocument, reflection: IPartFxPassReflection): PartRenderPassT {
    const scope = document.root.scope;
    const { geometry, sorting, instanceCount, CSParticlesPrerenderRoutine, drawMode } = reflection;
    const prerender = drawMode == EPassDrawMode.k_Auto 
        ? createFxRoutineBytecodeBundle(document, CSParticlesPrerenderRoutine)
        : createFxRoutineNoBytecodeBundle(); // fill dummy routine for backward compartibility
    // create GLSL attribute based instance layout
    const partType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(partType);
    const vertex = createFxRoutineShaderBundle(document, reflection.instance, reflection.VSParticleShader, 'vertex');
    const pixel = createFxRoutineShaderBundle(document, null, reflection.PSParticleShader, 'pixel');
    const routineTypes = [ RoutineBundle.RoutineBytecodeBundle, RoutineBundle.RoutineShaderBundle, RoutineBundle.RoutineShaderBundle ];
    const routines = [ prerender, vertex, pixel ]; // must be aligned with EPartFxRenderRoutines
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return new PartRenderPassT(routineTypes, routines, geometry, sorting, instanceCount, stride, instance);
}


function createMatFxRenderPass(document: ISLDocument, reflection: IPassReflection): MatRenderPassT {
    const scope = document.root.scope;
    const vertex = createFxRoutineShaderBundle(document, reflection.instance, reflection.VSParticleShader, 'vertex');
    const pixel = createFxRoutineShaderBundle(document, null, reflection.PSParticleShader, 'pixel');
    const routineTypes = [ RoutineBundle.RoutineShaderBundle, RoutineBundle.RoutineShaderBundle ];
    const routines = [ vertex, pixel ]; // must be aligned with EPartFxRenderRoutines
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
        return new RoutineBytecodeBundleT([], new RoutineBytecodeBundleResourcesT([]), []);
}

function createFxRoutineBytecodeBundle(document: ISLDocument, reflection: ICSShaderReflection): RoutineBytecodeBundleT {
    
    const entry = reflection.name;
    const shader = document.root.scope.findFunction(entry, null);
    assert(shader);
    const numthreads = [...reflection.numthreads];
    const program = Bytecode.translate(shader);
    const code = program.code;
    const uavs = reflection.uavs.map(({ name, register: slot, elementType }) => {
        const typeInstr = document.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = createFxTypeLayout(typeInstr);
        return new UAVBundleT(name, slot, stride, type);
    });

    return new RoutineBytecodeBundleT(Array.from(code), new RoutineBytecodeBundleResourcesT(uavs), numthreads);
}



function createFxRoutineShaderBundle(document: ISLDocument, interpolatorsType: string, routine: string, mode: 'vertex' | 'pixel'): RoutineShaderBundleT {
    const scope = document.root.scope;

    let codeGLSL = Glsl.translate(scope.findFunction(routine, null), { mode });
    let attributesGLSL;

    if (mode == 'vertex')
    {
        let partType = scope.findType(interpolatorsType);
        let instance = createFxTypeLayout(partType);

        attributesGLSL = instance.fields.map(field => {
            let size = field.size >> 2;
            let offset = field.padding >> 2;
            let attrName = Glsl.GlslEmitter.$declToAttributeName(partType.getField(<string>field.name));
            return new GLSLAttributeT(size, offset, attrName);
        });
    }

    const bundleGLSL = new RoutineGLSLSourceBundleT(codeGLSL, attributesGLSL);

    let codeHLSL = Hlsl.translate(scope.findFunction(routine, null), { mode });

    const bundleHLSL = new RoutineHLSLSourceBundleT(codeHLSL);

    const shaderType = [ RoutineSourceBundle.RoutineGLSLSourceBundle, RoutineSourceBundle.RoutineHLSLSourceBundle ];
    const shaderBundles = [ bundleGLSL, bundleHLSL ];

    return new RoutineShaderBundleT(shaderType, shaderBundles);
}


function createFxControls(controls: IUIControl[]): UIControlT[] {
    return controls.map(ctrl => {
        switch (ctrl.UIType) {
            case 'Spinner': 
            {
                const props = new UISpinnerT(ctrl.UIName, ctrl.UIMin || 0, ctrl.UIMax || 1000, ctrl.UIStep || 1, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UISpinner, props);
            }
            case 'FloatSpinner': 
            {
                const props = new UIFloatSpinnerT(ctrl.UIName,ctrl.UIMin || 0, ctrl.UIMax || 1000, ctrl.UIStep || 0.01, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIFloatSpinner, props);
            }
            case 'Color': 
            {
                const props = new UIColorT(ctrl.UIName, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIColor, props);
            }
            case 'Float': 
            {
                const props = new UIFloatT(ctrl.UIName, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIFloat, props);
            }
            case 'Float3': 
            {
                const props = new UIFloat3T(ctrl.UIName, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIFloat3, props);
            }
            case 'Int': 
            {
                const props = new UIIntT(ctrl.UIName, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIInt, props);
            }
            case 'Uint': 
            {
                const props = new UIUintT(ctrl.UIName, Array.from(ctrl.value));
                return new UIControlT(ctrl.name, UIProperties.UIUint, props);
            }
        }
    });
}


function createFxPresets(presets: IPreset[]): PresetT[] {
    return presets.map(
        ({ name, desc, data }) => new PresetT(
            name, 
            desc, 
            data.map(({ name, value }) => new PresetEntryT(name, Array.from(value)))
        )
    );
}


export interface BundleOptions
{
    packed?: boolean;
    meta?: {
        author: string;
        source: string;
    };
}


function finalizeBundle(bundle: BundleT, options: BundleOptions = {}): Uint8Array | BundleT {
    // get unpacked version
    // --------------------------------

    let { packed = PACKED } = options;

    if (!packed)
        return bundle;

    // get packed version
    // --------------------------------

    let fbb = new flatbuffers.Builder();
    let end = bundle.pack(fbb);
    fbb.finish(end);

    return fbb.asUint8Array();
}


async function createPartFxBundle(fx: IPartFxInstruction, options: BundleOptions = {}): Promise<Uint8Array | BundleT> {
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    const { name, capacity } = reflection;

    const textDocument = await createTextDocument('://raw', emitter.toString());
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

    const passes = reflection.passes.map(pass => createPartFxRenderPass(slDocument, pass));
    const part = new PartBundleT(capacity, routineTypes, routines, passes, particle);

    const controls = createFxControls(reflection.controls);
    const presets = createFxPresets(reflection.presets);

    const { meta } = options;
    const bundle = createFxBundle(name, BundleContent.PartBundle, part, new BundleMetaT(meta?.author, meta?.source), controls, presets); 

    return finalizeBundle(bundle, options);
}


async function createMatFxBundle(tech: ITechniqueInstruction, options: BundleOptions = {}): Promise<Uint8Array | BundleT> {
    const emitter = new FxTranslator();
    const reflection = emitter.emitTechniqueDecl(tech);
    const { name } = reflection;

    const textDocument = await createTextDocument('://mat-fx-bundle', emitter.toString());
    const slDocument = await createSLDocument(textDocument);
    const scope = slDocument.root.scope;

    if (slDocument.diagnosticReport.errors) {
        console.error(Diagnostics.stringify(slDocument.diagnosticReport));
        return null;
    }

    const passes = reflection.passes.map(pass => createMatFxRenderPass(slDocument, pass));
    const mat = new MatBundleT(passes);

    const controls = createFxControls(reflection.controls);
    const presets = createFxPresets(reflection.presets);

    const { meta } = options;
    const bundle = createFxBundle(name, BundleContent.MatBundle, mat, new BundleMetaT(meta?.author, meta?.source), controls, presets); 

    return finalizeBundle(bundle, options);
}


export async function createBundle(fx: ITechniqueInstruction, options: BundleOptions = {}): Promise<Uint8Array | BundleT> {
    switch (fx.instructionType) {
        case EInstructionTypes.k_PartFxDecl:
            return createPartFxBundle(<IPartFxInstruction>fx, options);
        case EInstructionTypes.k_TechniqueDecl:
            return createMatFxBundle(fx, options);
    }
    console.assert(false);
    return null;
}
