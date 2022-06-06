import { assert } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { FxTranslator, ICSShaderReflection, IPartFxPassReflection } from "@lib/fx/translators/FxTranslator";
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { Bundle, BundleContent, BundleSignatureT, BundleT, EPartSimRoutines, GLSLAttributeT, PartBundleT, PartRenderPassT, RoutineBundle, RoutineBytecodeBundleResourcesT, RoutineBytecodeBundleT, RoutineGLSLBundleT, TypeLayoutT, UAVBundleT } from "@lib/idl/bundles/FxBundle_generated";
import { ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { Diagnostics } from "@lib/util/Diagnostics";
import * as flatbuffers from 'flatbuffers';

export const PACKED = true;


// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleSignature(): BundleSignatureT {
    return new BundleSignatureT( MODE, VERSION, COMMITHASH, BRANCH, TIMESTAMP );
}


function createFxBundle(name: string, type: 'part', data: PartBundleT): BundleT {
    const signature = getFxBundleSignature();
    return new BundleT(name, signature, BundleContent.PartBundle, data);
}



function createPartFxGLSLRenderPass(document: ISLDocument, reflection: IPartFxPassReflection): PartRenderPassT {
    const scope = document.root.scope;
    const { geometry, sorting, instanceCount, CSParticlesPrerenderRoutine } = reflection;
    const prerender = createFxRoutineBytecodeBundle(document, CSParticlesPrerenderRoutine);
    // create GLSL attribute based instance layout
    const partType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(partType);
    const vertex = createFxRoutineGLSLBundle(document, reflection.instance, reflection.VSParticleShader, 'vertex');
    const pixel = createFxRoutineGLSLBundle(document, null, reflection.PSParticleShader, 'pixel');
    const routineTypes = [ RoutineBundle.RoutineBytecodeBundle, RoutineBundle.RoutineGLSLBundle, RoutineBundle.RoutineGLSLBundle ];
    const routines = [ prerender, vertex, pixel ]; // must be aligned with EPartFxRenderRoutines
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return new PartRenderPassT(routineTypes, routines, geometry, sorting, instanceCount, stride, instance);
}


function createFxTypeLayout(type: ITypeInstruction): TypeLayoutT {
    return typeAstToTypeLayout(type);
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


function createFxRoutineGLSLBundle(document: ISLDocument, interpolatorsType: string, routine: string, mode: 'vertex' | 'pixel'): RoutineGLSLBundleT {
    const scope = document.root.scope;

    let code = Glsl.translate(scope.findFunction(routine, null), { mode });
    let attributes;

    if (mode == 'vertex')
    {
        let partType = scope.findType(interpolatorsType);
        let instance = createFxTypeLayout(partType);

        attributes = instance.fields.map(field => {
            let size = field.size >> 2;
            let offset = field.padding >> 2;
            let attrName = Glsl.GlslEmitter.$declToAttributeName(partType.getField(<string>field.name));
            return new GLSLAttributeT(size, offset, attrName);
        });
    }

    return new RoutineGLSLBundleT(code, attributes);
}


function compareFxTypeLayouts(left: TypeLayoutT, right: TypeLayoutT) {
    return JSON.stringify(left) == JSON.stringify(right);
}


export async function createPartFxBundle(fx: IPartFxInstruction, packed: boolean = PACKED): Promise<Uint8Array | BundleT> {
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    const { name, capacity } = reflection;

    const textDocument = createTextDocument('://raw', emitter.toString());
    const slDocument = await createSLDocument(textDocument);
    const scope = slDocument.root.scope;


    if (slDocument.diagnosticReport.errors) {
        console.error(Diagnostics.stringify(slDocument.diagnosticReport));
        return null;
    }

    const particle = createFxTypeLayout(scope.findType(reflection.particle));
    const routines = Array<RoutineGLSLBundleT | RoutineBytecodeBundleT>(EPartSimRoutines.k_Last);
    const routineTypes = Array<RoutineBundle>(EPartSimRoutines.k_Last);

    routineTypes[EPartSimRoutines.k_Reset] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Reset] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesResetRoutine);

    routineTypes[EPartSimRoutines.k_Spawn] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Spawn] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesSpawnRoutine);

    routineTypes[EPartSimRoutines.k_Init] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Init] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesInitRoutine);

    routineTypes[EPartSimRoutines.k_Update] = RoutineBundle.RoutineBytecodeBundle;
    routines[EPartSimRoutines.k_Update] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesUpdateRoutine);

    const passes = reflection.passes.map(pass => createPartFxGLSLRenderPass(slDocument, pass));
    const part = new PartBundleT(capacity, routineTypes, routines, passes, particle);

    const bundle = createFxBundle(name, 'part', part);
    // get unpacked version
    // --------------------------------

    if (!PACKED)
        return bundle;

    // get packed version
    // --------------------------------

    let fbb = new flatbuffers.Builder();
    let end = bundle.pack(fbb);
    fbb.finish(end);

    return fbb.asUint8Array();
}

// todo: rework comparisson to be more readable and compact
export function comparePartFxBundles(left: PartBundleT, right: PartBundleT): boolean {
    if (left.capacity != right.capacity) return false;
    if (left.renderPasses.length != right.renderPasses.length) return false;
    if (!compareFxTypeLayouts(left.particle, right.particle)) return false;
    for (let i = 0; i < left.renderPasses.length; ++i) {
        if (left.renderPasses[i].geometry != right.renderPasses[i].geometry) return false;
        if (left.renderPasses[i].sorting != right.renderPasses[i].sorting) return false;
        if (!compareFxTypeLayouts(left.renderPasses[i].instance, right.renderPasses[i].instance)) return false;
    }
    return true;
}
