import { assert } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { typeAstToTypeLayout } from "@lib/fx/bytecode/VM/native";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { FxTranslator, ICSShaderReflection, IPartFxPassReflection } from "@lib/fx/translators/FxTranslator";
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { EPartFxSimRoutines, FxBundleType, IFxBundle, IFxBundleSignature, IFxRoutineBundle, IFxRoutineGLSLBundle, IFxTypeLayout, IFxUAVBundle, IPartFxBundle, IPartFxRenderPass } from "@lib/idl/bundles/IFxBundle";
import { ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IPartFxInstruction } from "@lib/idl/part/IPartFx";
import { Diagnostics } from "@lib/util/Diagnostics";

function createFxBundleHeader(name: string, type: FxBundleType): IFxBundle {
    const version = getFxBundleVersion();
    return { name, type, version };
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
    const routines = [prerender, vertex, pixel]; // must be aligned with EPartFxRenderRoutines
    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return { routines, geometry, sorting, instanceCount, stride, instance };
}


// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleVersion(): IFxBundleSignature {
    return {
        version: VERSION,
        commithash: COMMITHASH,
        branch: BRANCH,
        mode: MODE,
        timestamp: TIMESTAMP
    };
}


function createFxTypeLayout(type: ITypeInstruction): IFxTypeLayout {
    return typeAstToTypeLayout(type);
}


function createFxRoutineBytecodeBundle(document: ISLDocument, reflection: ICSShaderReflection): IFxRoutineBundle {
    const type = 'bc';
    const entry = reflection.name;
    const shader = document.root.scope.findFunction(entry, null);
    assert(shader);

    const numthreads = [...reflection.numthreads];
    const program = Bytecode.translate(shader);
    const code = program.code;
    const uavs = reflection.uavs.map(({ name, register: slot, elementType }): IFxUAVBundle => {
        const typeInstr = document.root.scope.findType(elementType);
        const stride = typeInstr.size; // in bytes
        const type = typeAstToTypeLayout(typeInstr);
        return { name, slot, stride, type };
    });

    return { type, code, resources: { uavs }, numthreads };
}


function createFxRoutineGLSLBundle(document: ISLDocument, interpolatorsType: string, routine: string, mode: 'vertex' | 'pixel'): IFxRoutineGLSLBundle {
    const scope = document.root.scope;
    const type = 'glsl';
    
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
            return { attrName, size, offset };
        });
    }

    return { type, code, attributes };
}


function compareFxTypeLayouts(left: IFxTypeLayout, right: IFxTypeLayout) {
    return JSON.stringify(left) == JSON.stringify(right);
}


export async function createPartFxBundle(fx: IPartFxInstruction): Promise<IPartFxBundle> {
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

    routines[EPartFxSimRoutines.k_Reset] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesResetRoutine);
    routines[EPartFxSimRoutines.k_Spawn] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesSpawnRoutine);
    routines[EPartFxSimRoutines.k_Init] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesInitRoutine);
    routines[EPartFxSimRoutines.k_Update] = createFxRoutineBytecodeBundle(slDocument, reflection.CSParticlesUpdateRoutine);

    const passes = reflection.passes.map(pass => createPartFxGLSLRenderPass(slDocument, pass));

    return {
        ...createFxBundleHeader(name, 'part'),
        capacity,
        particle,
        simulationRoutines: routines,
        renderPasses: passes
    };
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
