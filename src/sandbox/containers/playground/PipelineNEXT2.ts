import { assert, isDefAndNotNull, verbose } from '@lib/common';
import { type } from '@lib/fx/analisys/helpers';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { createSLDocument } from '@lib/fx/SLDocument';
import { FxTranslator, ICSShaderReflection, IPartFxPassReflection, IUavReflection } from '@lib/fx/translators/FxTranslator';
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { IMap } from '@lib/idl/IMap';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { Vector3 } from 'three';

import { IPass } from './IEmitter';
import { Diagnostics } from '@lib/util/Diagnostics';
import { createTextDocument } from '@lib/fx/TextDocument';
import { EInstructionTypes, ITypeInstruction } from '@lib/idl/IInstruction';
import { typeAstToTypeLayout, TypeLayout } from '@lib/fx/bytecode/VM/native';

// TODO: use CDL instead of reflection

/* tslint:disable:typedef */
/* tslint:disable:variable-name */
/* tslint:disable:member-ordering */

type IUAVResource = ReturnType<typeof VM.createUAV>;


function createUAVEx(bundle: IFxUAVBundle, capacity: number): IUAVResource {
    return VM.createUAV(bundle.name, bundle.stride, capacity, bundle.slot);
}

// tslint:disable-next-line:max-line-length
function createUAVsEx(bundles: IFxUAVBundle[], capacity: number, sharedUAVs: IUAVResource[] = []): IUAVResource[] {
    return bundles.map(uavBundle => {
        const shraredUAV = sharedUAVs.find(uav => uav.name === uavBundle.name);
        return shraredUAV || createUAVEx(uavBundle, capacity);
    });
}

function createFxRoutineBytecodeBundle(document: ISLDocument, reflection: ICSShaderReflection): IFxRoutineBundle {
    const type = 'bytecode';
    const entry = reflection.name;
    const shader = document.root.scope.findFunction(entry, null);
    assert(shader);

    const numthreads = [ ...reflection.numthreads ];
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

function createFxRoutineGLSLBundle(document: ISLDocument, routine: string, mode: 'vertex' | 'pixel'): IFxRoutineBundle {
    const scope = document.root.scope;
    // const func = scope.findFunction(routine, null);
    // const entry = 'main';
    const type = 'glsl';
    const code = Glsl.translate(scope.findFunction(routine, null), { mode });;
    return { type, code };
}

function loadVMBundle(code: Uint8Array)
{
    return VM.load(code);
}

function setupFxRoutineBytecodeBundle(rountineBundle: IFxRoutineBundle, capacity: number, sharedUAVs: IUAVResource[]) {
    const vmBundle = loadVMBundle(rountineBundle.code as Uint8Array);
    const uavs = createUAVsEx(rountineBundle.resources.uavs, capacity, sharedUAVs);
    const numthreads = rountineBundle.numthreads;
    
    // setup VM inputs
    uavs.forEach(uav => { vmBundle.input[uav.index] = uav.buffer; });

    // update shared uavs
    sharedUAVs.push(...uavs.filter(uav => sharedUAVs.indexOf(uav) === -1));

    function setConstants(constants: IMap<number>) {
        Object.keys(constants)
            .forEach(name => VM.setConstant(vmBundle, name, constants[name]));
    }

    assert(numthreads[0] >= 1 && numthreads[1] === 1 && numthreads[2] === 1);

    function run(numgroups: number) {
        VM.dispatch(vmBundle, [numgroups, 1, 1], numthreads);
    }

    return {
        uavs,
        bundle: vmBundle,
        run,
        setConstants,
        groupsizex: numthreads[0]
    };
}


// function fxHash(fx: IPartFxBundle) {
//     const hashPart = fx.renderPasses
//         .map(pass => `${type.signature(pass.instance)}:${pass.geometry}:${pass.sorting}:`) // +
//         // `${crc32(Code.translate(pass.vertexShader))}:${crc32(Code.translate(pass.pixelShader))}`)
//         .reduce((commonHash, passHash) => `${commonHash}:${passHash}`);
//     return `${type.signature(fx.particle)}:${fx.capacity}:${hashPart}`;
// }


function createTimelime() {
    let startTime: number;
    let elapsedTimeLevel: number;
    let active: boolean;

    const constants = {
        elapsedTime: 0,
        elapsedTimeLevel: 0
    };

    function stop() {
        active = false;
        verbose('emitter stopped');
    }

    function start() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;

        startTime = Date.now();
        elapsedTimeLevel = 0;
        active = true;
        verbose('emitter started');
    }

    function tick() {
        if (!active) {
            return;
        }

        const dt = Date.now() - startTime;
        constants.elapsedTime = (dt - elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = elapsedTimeLevel / 1000;
        elapsedTimeLevel = dt;
    }

    function isStopped() {
        return !active;
    }

    return {
        constants,
        start,
        stop,
        tick,
        isStopped
    };
}

type ITimeline = ReturnType<typeof createTimelime>;

interface IPassEx extends IPass {
    bundle: ReturnType<typeof setupFxRoutineBytecodeBundle>;
    dump(): void;
}

// todo: rename
// contains all necessary unpacked data to load and play effect
interface IFxBundleSignature
{
    mode: string;
    version: string;
    commithash: string;
    branch: string;
    timestamp: string;
}

// global defines from webpack's config;
/// <reference path="../../webpack.d.ts" />
function getFxBundleVersion(): IFxBundleSignature
{
    return {
        version: VERSION,
        commithash: COMMITHASH,
        branch: BRANCH,
        mode: MODE,
        timestamp: TIMESTAMP
    };
}

type FxBundleType = 'part';

interface IFxBundle
{
    version: IFxBundleSignature;
    name: string;
    type: FxBundleType;
}

interface IFxUAVBundle
{
    name: string;
    slot: number;
    stride: number;
    type: IFxTypeLayout;
}

interface IFxRoutineBundle
{
    type: 'bytecode' | 'glsl';
    code: Uint8Array | string;
    resources?: { uavs: IFxUAVBundle[]; };
    numthreads?: number[];
}

enum EPartFxSimRoutines {
    k_Reset,
    k_Spawn,
    k_Init,
    k_Update,
    k_Last
}

enum EPartFxRenderRoutines
{
    k_Prerender,
    k_Vertex,
    k_Pixel,
    k_Last
}

interface IPartFxRenderPass
{
    routines: IFxRoutineBundle[];
    geometry: string;           // template name
    sorting: boolean;
    instanceCount: number;
    stride: number;             // instance stride in 32bit (integers)
    instance: IFxTypeLayout;
}

type IFxTypeLayout= TypeLayout;

interface IPartFxBundle extends IFxBundle
{
    capacity: number;   // maximum number of particles allowed (limited by user manually in the sandbox)

    simulationRoutines: IFxRoutineBundle[];
    renderPasses: IPartFxRenderPass[];
    particle: IFxTypeLayout;
}


function createFxBundleHeader(name: string, type: FxBundleType): IFxBundle
{
    const version = getFxBundleVersion();
    return { name, type, version };
}


function createPartFxGLSLRenderPass(document: ISLDocument, reflection: IPartFxPassReflection): IPartFxRenderPass
{
    const scope = document.root.scope;
    const { geometry, sorting, instanceCount, CSParticlesPrerenderRoutine } = reflection;
    const prerender = createFxRoutineBytecodeBundle(document, CSParticlesPrerenderRoutine);
    const vertex = createFxRoutineGLSLBundle(document, reflection.VSParticleShader, 'vertex');
    const pixel = createFxRoutineGLSLBundle(document, reflection.PSParticleShader, 'pixel');
    const routines = [ prerender, vertex, pixel ]; // must be aligned with EPartFxRenderRoutines
   
    // create GLSL attribute based instance layout
    const partType = scope.findType(reflection.instance);
    const instance = createFxTypeLayout(partType);
    instance.fields.forEach(field => field.name = Glsl.GlslEmitter.$declToAttributeName(partType.getField(field.name)));

    const instanceType = scope.findType(reflection.instance);
    const stride = instanceType.size >> 2;

    return { routines, geometry, sorting, instanceCount, stride, instance };
}

function createFxTypeLayout(type: ITypeInstruction): IFxTypeLayout
{
    return typeAstToTypeLayout(type);
}

export async function createPartFxBundle(fx: IPartFxInstruction): Promise<IPartFxBundle>
{
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

// tslint:disable-next-line:max-func-body-length
async function loadFromBundle(bundle: IPartFxBundle, uavResources: IUAVResource[]) {
    const { name, capacity, particle } = bundle;
    
    const resetBundle = setupFxRoutineBytecodeBundle(bundle.simulationRoutines[EPartFxSimRoutines.k_Reset], capacity, uavResources);
    const initBundle = setupFxRoutineBytecodeBundle(bundle.simulationRoutines[EPartFxSimRoutines.k_Init], capacity, uavResources);
    const updateBundle = setupFxRoutineBytecodeBundle(bundle.simulationRoutines[EPartFxSimRoutines.k_Update], capacity, uavResources);
    const spawnBundle = setupFxRoutineBytecodeBundle(bundle.simulationRoutines[EPartFxSimRoutines.k_Spawn], 4, uavResources);
    
    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);
    const uavInitArguments = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS);

    const passes = bundle.renderPasses.map(({ 
        routines,
        geometry,
        sorting,
        instanceCount,
        instance,
        stride
    }, i): IPassEx => {
        const UAV_PRERENDERED = `uavPrerendered${i}`;

        const prerender = routines[EPartFxRenderRoutines.k_Prerender];
        const bundle = setupFxRoutineBytecodeBundle(prerender, capacity * instanceCount, uavResources);
        const uav = bundle.uavs.find(uav => uav.name === UAV_PRERENDERED);

        const vertexShader = routines[EPartFxRenderRoutines.k_Vertex].code as string;
        const pixelShader = routines[EPartFxRenderRoutines.k_Pixel].code as string;

        const numRenderedParticles = () => numParticles() * instanceCount;

        const instanceLayout = instance.fields.map(field => {
            const size = field.size >> 2;
            const offset = field.padding >> 2;
            const attrName = field.name;
            return { attrName, size, offset };
        });

        // tslint:disable-next-line:max-line-length
        const uavPrerenderedReflection = prerender.resources.uavs.find(uavReflection => uavReflection.name === UAV_PRERENDERED);
        // const elementType = scope.findType(uavPrerenderedReflection.elementType);

        // dump prerendered particles
        const dump = (): void => {
            verbose(`dump ${uav.readCounter()}/${capacity} prerendred particles: `);
            for (let iElement = 0; iElement < uav.readCounter(); ++iElement) {
                verbose(VM.asNative(uav.readElement(iElement), instance));
            }
        };


        //
        // Sorting
        //

        const uavNonSorted = uav;
        const uavSorted = !sorting ? uavNonSorted : createUAVEx(uavPrerenderedReflection, capacity);

        function sort(targetPos: Vector3) {
            assert(sorting);

            // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
            //       I hate javascript for that :/

            const v3 = new Vector3();
            const length = numRenderedParticles();

            const nStride = stride * instanceCount; // stride in floats

            assert(uavSorted.data.byteLength >> 2 === nStride * capacity);

            const src = new Float32Array(uavNonSorted.data.buffer, uavNonSorted.data.byteOffset, uavNonSorted.data.byteLength >> 2);
            const dst = new Float32Array(uavSorted.data.buffer, uavSorted.data.byteOffset, uavSorted.data.byteLength >> 2);

            const indicies = [];

            // NOTE: sort using only first instance's postion
            for (let iPart = 0; iPart < length; ++iPart) {
                const offset = iPart * nStride;
                const dist = v3
                    .fromArray(src, offset/* add offset of POSTION semantic */)
                    .distanceTo(targetPos);
                indicies.push([iPart, dist]);
            }

            indicies.sort((a, b) => -a[1] + b[1]);

            for (let i = 0; i < indicies.length; ++i) {
                const iFrom = indicies[i][0] * nStride;
                const iTo = i * nStride;

                const from = src.subarray(iFrom, iFrom + nStride);
                const copyTo = dst.subarray(iTo, iTo + nStride);
                copyTo.set(from);
            }
        }

        const data = new Uint8Array(uavSorted.data.buffer, uavSorted.data.byteOffset, uavSorted.data.byteLength);
        return {
            data,
            instanceLayout,
            stride,
            geometry,
            sorting,
            vertexShader,
            pixelShader,
            length: numRenderedParticles,
            sort,
            bundle,
            dump
        };
    });

    const numParticles = () => capacity - uavDeadIndices.readCounter();

    function reset() {
        // reset all available particles
        resetBundle.run(Math.ceil(capacity / resetBundle.groupsizex));
        uavDeadIndices.overwriteCounter(capacity);
    }


    function update(timeline: ITimeline) {
        updateBundle.setConstants(timeline.constants);
        updateBundle.run(Math.ceil(capacity / updateBundle.groupsizex));
    }


    function prerender(timelime: ITimeline) {
        passes.forEach(({ bundle }, i) => {
            const uavPrerendered = bundle.uavs.find(uav => uav.name === `uavPrerendered${i}`);
            uavPrerendered.overwriteCounter(0);
            bundle.setConstants(timelime.constants);
            bundle.run(Math.ceil(capacity / bundle.groupsizex));
        });
    }


    function emit(timeline: ITimeline) {
        initBundle.setConstants(timeline.constants);
        // console.log('emit >>', uavInitArguments.data[0],
        //     (new Float32Array(uavInitArguments.data.buffer, uavInitArguments.data.byteOffset))[3],
        //     (new Float32Array(uavInitArguments.data.buffer, uavInitArguments.data.byteOffset))[4]);
        initBundle.run(uavInitArguments.data[0]);

        spawnBundle.setConstants(timeline.constants);
        spawnBundle.run(1);
        // console.log(spawnBundle.uavs, timeline.constants.elapsedTime);
        return;
    }


    function dump() {
        const npart = numParticles();
        const partSize = particle.size;

        verbose(`particles total: ${npart} (${uavDeadIndices.readCounter()}/${capacity})`);

        uavStates.data.forEach((alive, iPart) => {
            if (alive) {
                const partRaw = new Uint8Array(uavParticles.data.buffer, uavParticles.data.byteOffset + iPart * partSize, partSize);
                verbose(iPart, VM.asNative(partRaw, particle));
            }
        });
    }


    return {
        name,
        capacity,
        passes,
        numParticles,
        reset,
        emit,
        update,
        prerender,
        dump
    };
}


// tslint:disable-next-line:max-func-body-length
export async function createEmitterFromBundle(fx: IPartFxBundle) {

    const uavResources: IUAVResource[] = []; // << shared UAV resources
    const timeline = createTimelime();
    const emitter = await loadFromBundle(fx, uavResources);

    if (!emitter) {
        return null;
    }

    let {
        name,
        capacity,
        passes,
        numParticles,
        reset,
        emit,
        update,
        prerender,
        dump
    } = emitter;

    reset();

    const { start, stop, isStopped } = timeline;

    function tick() {
        if (!timeline.isStopped()) {
            update(timeline);
            emit(timeline);
            prerender(timeline);
            timeline.tick();
        }
    }


    async function shadowReload(fxNext: IPartFxBundle): Promise<boolean> {
        // if (fxHash(fxNext) !== fxHash(fx)) 
        // {
        //     return false;
        // }
        return false;

        verbose('emitter reloaded from the shadow');

        const emitter = await loadFromBundle(fxNext, uavResources);

        if (!emitter) {
            return false;
        }

        ({
            name,
            capacity,
            passes,
            numParticles,
            reset,
            emit,
            update,
            prerender,
            dump
        } = emitter);

        return true;
    }

    return {
        get name() {
            return name;
        },

        capacity,

        start,
        stop,
        tick,
        isStopped,
        length: numParticles,
        passes,

        reset,
        shadowReload
    };
}


// export type Emitter = ReturnType<typeof createEmitterFromBundle>;
// export type Pass = IPass;
