import { assert } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { typeAstToTypeLayout, TypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { FxTranslator, ICSShaderReflection, IPartFxPassReflection } from "@lib/fx/translators/FxTranslator";
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { EPartFxSimRoutines, IFxBundle, IFxBundleSignature, IFxRoutineBundle, IFxRoutineBytecodeBundle, IFxRoutineGLSLBundle, IFxTypeLayout, IFxUAVBundle, IPartFxBundle, IPartFxRenderPass, serializable } from "@lib/idl/bundles/IFxBundle";
import { ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { Diagnostics } from "@lib/util/Diagnostics";

// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleSignature(): IFxBundleSignature {
    return {
        ...serializable('signature'),
        version: VERSION,
        commithash: COMMITHASH,
        branch: BRANCH,
        mode: MODE,
        timestamp: TIMESTAMP
    };
}


function createFxBundle(name: string, type: 'part', data: IPartFxBundle): IFxBundle {
    const signature = getFxBundleSignature();
    const part = data as IPartFxBundle;
    return { ...serializable('bundle'), name, signature, content: { ...serializable('bundle-content'), type, union: { part } } };
}

function createFxRoutineBundle(type: 'glsl' | 'bc', data: IFxRoutineGLSLBundle | IFxRoutineBytecodeBundle): IFxRoutineBundle
{
    let glsl = null;
    let bc = null;
    switch (type)
    {
        case 'bc': 
            bc = data as IFxRoutineBytecodeBundle;
            break;
        case 'glsl': 
            glsl = data as IFxRoutineGLSLBundle;
            break;
    }

    return { ...serializable('routine'), type, union: { bc, glsl } };
}

function createPartFxGLSLRenderPass(document: ISLDocument, reflection: IPartFxPassReflection): IPartFxRenderPass {
    const scope = document.root.scope;
    const { geometry, sorting, instanceCount, CSParticlesPrerenderRoutine } = reflection;
    const prerender = createFxRoutineBytecodeBundle(document, CSParticlesPrerenderRoutine);
    // create GLSL attribute based instance layout
    const partType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(partType);
    const vertex = createFxRoutineGLSLBundle(document, reflection.instance, reflection.VSParticleShader, 'vertex');
    const pixel = createFxRoutineGLSLBundle(document, null, reflection.PSParticleShader, 'pixel');
    const routines = [ createFxRoutineBundle('bc', prerender), createFxRoutineBundle('glsl', vertex), createFxRoutineBundle('glsl', pixel) ]; // must be aligned with EPartFxRenderRoutines
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return { ...serializable('part-fx-render-pass'), routines, geometry, sorting, instanceCount, stride, instance };
}

function patchFxTypeLayout(raw: TypeLayout): IFxTypeLayout
{
    let layout = { ...serializable('type-layout'), ...raw };
    if (layout.fields)
    {
        layout.fields = layout.fields.map(field => ({ ...serializable('type-layout-field'), ...field, type: patchFxTypeLayout(field.type) }));
    }
    return layout;
}

function createFxTypeLayout(type: ITypeInstruction): IFxTypeLayout {
    const layout = typeAstToTypeLayout(type);
    return patchFxTypeLayout(layout);
}


function createFxRoutineBytecodeBundle(document: ISLDocument, reflection: ICSShaderReflection): IFxRoutineBytecodeBundle {
    const entry = reflection.name;
    const shader = document.root.scope.findFunction(entry, null);
    assert(shader);

    const numthreads = [...reflection.numthreads];
    const program = Bytecode.translate(shader);
    const code = program.code;
    const uavs = reflection.uavs.map(({ name, register: slot, elementType }): IFxUAVBundle => {
        const typeInstr = document.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = createFxTypeLayout(typeInstr);
        return { ...serializable('uav'), name, slot, stride, type };
    });

    return { ...serializable('bytecode-routine'), code, resources: { ...serializable('bytecode-routine-resources'), uavs }, numthreads };
}


function createFxRoutineGLSLBundle(document: ISLDocument, interpolatorsType: string, routine: string, mode: 'vertex' | 'pixel'): IFxRoutineGLSLBundle {
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
            let attrName = Glsl.GlslEmitter.$declToAttributeName(partType.getField(field.name));
            return { ...serializable('GLSL-attribute'), attrName, size, offset };
        });
    }

    return { ...serializable('GLSL-routine'), code, attributes };
}


function compareFxTypeLayouts(left: IFxTypeLayout, right: IFxTypeLayout) {
    return JSON.stringify(left) == JSON.stringify(right);
}


export async function createPartFxBundle(fx: IPartFxInstruction): Promise<IFxBundle> {
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
    const routines = Array<IFxRoutineBundle>(EPartFxSimRoutines.k_Last);

    routines[EPartFxSimRoutines.k_Reset] = createFxRoutineBundle('bc', createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesResetRoutine));
    routines[EPartFxSimRoutines.k_Spawn] = createFxRoutineBundle('bc', createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesSpawnRoutine));
    routines[EPartFxSimRoutines.k_Init] = createFxRoutineBundle('bc', createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesInitRoutine));
    routines[EPartFxSimRoutines.k_Update] = createFxRoutineBundle('bc', createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesUpdateRoutine));

    const passes = reflection.passes.map(pass => createPartFxGLSLRenderPass(slDocument, pass));

    const part: IPartFxBundle = {
        ...serializable('part-fx-bundle'), 
        capacity,
        particle,
        simulationRoutines: routines,
        renderPasses: passes
    };

    return createFxBundle(name, 'part', part);
}

// todo: rework comparisson to be more readable and compact
export function comparePartFxBundles(left: IPartFxBundle, right: IPartFxBundle): boolean {
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


export function serializeBundlesToJSON(bundles: IFxBundle[])
{
    // quick fix: convert Uint8Array to native [];
    bundles.forEach(bundle => {
        if (bundle.content.type != 'part') return null;
        const asNativeArray = (arr) => arr instanceof Uint8Array ? Array.from(arr) : arr;
        const partBundle = bundle.content.union.part;
        partBundle.simulationRoutines.forEach(routine => routine.union.bc.code = asNativeArray(routine.union.bc.code));
        partBundle.renderPasses.forEach(pass => pass.routines.forEach(routine => (routine.union.bc ? routine.union.bc.code = asNativeArray(routine.union.bc.code) : null, routine)));
    });
    return JSON.stringify(bundles, null, '\t');
}