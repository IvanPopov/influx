import { assert, isDefAndNotNull, verbose } from '@lib/common';
import { type } from '@lib/fx/analisys/helpers';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { createSLDocument } from '@lib/fx/SLDocument';
import { FxTranslator, ICSShaderReflection, IUavReflection } from '@lib/fx/translators/FxTranslator';
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { IMap } from '@lib/idl/IMap';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { Vector3 } from 'three';

import { IPass } from './IEmitter';
import { Diagnostics } from '@lib/util/Diagnostics';
import { createTextDocument } from '@lib/fx/TextDocument';

// TODO: use CDL instead of reflection

/* tslint:disable:typedef */
/* tslint:disable:variable-name */
/* tslint:disable:member-ordering */

type IUAVResource = ReturnType<typeof VM.createUAV>;


function createUAVEx(document: ISLDocument, reflection: IUavReflection, length: number): IUAVResource {
    const elementSize = document.root.scope.findType(reflection.elementType).size; // in bytes
    return VM.createUAV(reflection.name, elementSize, length, reflection.register);
}

// tslint:disable-next-line:max-line-length
function createUAVsEx(document: ISLDocument, reflection: ICSShaderReflection, capacity: number, sharedUAVs: IUAVResource[] = []): IUAVResource[] {
    return reflection.uavs.map(uavReflection => {
        const shraredUAV = sharedUAVs.find(uav => uav.name === uavReflection.name);
        return shraredUAV || createUAVEx(document, uavReflection, capacity);
    });
}

function createBundle(document: ISLDocument, reflection: ICSShaderReflection): VM.Bundle {
    const shader = document.root.scope.findFunction(reflection.name, null);
    assert(shader);

    // const numthreads = shader.attributes.find(attr => attr.name === 'numthreads');
    // assert(isDefAndNotNull(numthreads));

    const program = Bytecode.translate(shader);
    return VM.load(program.code);
}

function setupBundle(document: ISLDocument, reflection: ICSShaderReflection, capacity: number, sharedUAVs: IUAVResource[]) {
    const bundle = createBundle(document, reflection);
    const uavs = createUAVsEx(document, reflection, capacity, sharedUAVs);
    const numthreads = reflection.numthreads;
    uavs.forEach(uav => { bundle.input[uav.index] = uav.buffer; });

    // update shared uavs
    sharedUAVs.push(...uavs.filter(uav => sharedUAVs.indexOf(uav) === -1));

    function setConstants(constants: IMap<number>) {
        Object.keys(constants)
            .forEach(name => VM.setConstant(bundle, name, constants[name]));
    }

    assert(numthreads[0] >= 1 && numthreads[1] === 1 && numthreads[2] === 1);

    function run(numgroups: number) {
        VM.dispatch(bundle, [numgroups, 1, 1], numthreads);
    }

    return {
        uavs,
        bundle,
        run,
        setConstants,
        groupsizex: numthreads[0]
    };
}


function fxHash(fx: IPartFxInstruction) {
    const hashPart = fx.passList
        .map(pass => `${type.signature(pass.particleInstance)}:${pass.geometry}:${pass.sorting}:`) // +
        // `${crc32(Code.translate(pass.vertexShader))}:${crc32(Code.translate(pass.pixelShader))}`)
        .reduce((commonHash, passHash) => `${commonHash}:${passHash}`);
    return `${type.signature(fx.particle)}:${fx.capacity}:${hashPart}`;
}


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
    bundle: ReturnType<typeof setupBundle>;
    dump(): void;
}

// tslint:disable-next-line:max-func-body-length
async function load(fx: IPartFxInstruction, uavResources: IUAVResource[]) {
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    const textDocument = createTextDocument('://raw', emitter.toString());
    const slDocument = await createSLDocument(textDocument);

    if (slDocument.diagnosticReport.errors) {
        console.error(Diagnostics.stringify(slDocument.diagnosticReport));
        return null;
    }

    const { name, capacity } = reflection;
    const scope = slDocument.root.scope;
    const particle = scope.findType(reflection.particle);

    const resetBundle = setupBundle(slDocument, reflection.CSParticlesResetRoutine, capacity, uavResources);
    const initBundle = setupBundle(slDocument, reflection.CSParticlesInitRoutine, capacity, uavResources);
    const updateBundle = setupBundle(slDocument, reflection.CSParticlesUpdateRoutine, capacity, uavResources);
    const spawnBundle = setupBundle(slDocument, reflection.CSParticlesSpawnRoutine, 4, uavResources);

    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);
    const uavInitArguments = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS);

    const passes = reflection.passes.map(({ VSParticleShader,
        PSParticleShader,
        geometry,
        sorting,
        instanceCount,
        instance,
        CSParticlesPrerenderRoutine
    }, i): IPassEx => {

        const UAV_PRERENDERED = `uavPrerendered${i}`;

        const bundle = setupBundle(slDocument, CSParticlesPrerenderRoutine, capacity * instanceCount, uavResources);
        const uav = bundle.uavs.find(uav => uav.name === UAV_PRERENDERED);

        const vertexShader = Glsl.translate(scope.findFunction(VSParticleShader, null), { mode: 'vertex' });
        const pixelShader = Glsl.translate(scope.findFunction(PSParticleShader, null), { mode: 'pixel' });
        const instanceType = scope.findType(instance);
        const stride = instanceType.size >> 2;

        const numRenderedParticles = () => numParticles() * instanceCount;

        const instanceLayout = instanceType.fields.map(field => {
            const size = field.type.size >> 2;
            const offset = field.type.padding >> 2;
            const attrName = Glsl.GlslEmitter.$declToAttributeName(field);
            return { attrName, size, offset };
        });

        // tslint:disable-next-line:max-line-length
        const uavPrerenderedReflection = CSParticlesPrerenderRoutine.uavs.find(uavReflection => uavReflection.name === UAV_PRERENDERED);
        const elementType = scope.findType(uavPrerenderedReflection.elementType);

        // dump prerendered particles
        const dump = (): void => {
            verbose(`dump ${uav.readCounter()}/${capacity} prerendred particles: `);
            for (let iElement = 0; iElement < uav.readCounter(); ++iElement) {
                verbose(VM.asNativeInner(uav.readElement(iElement), elementType));
            }
        };


        //
        // Sorting
        //

        const uavNonSorted = uav;
        const uavSorted = !sorting ? uavNonSorted : createUAVEx(slDocument, uavPrerenderedReflection, capacity);

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
                verbose(iPart, VM.asNativeInner(partRaw, particle));
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
export async function createEmitter(fx: IPartFxInstruction) {

    const uavResources: IUAVResource[] = []; // << shared UAV resources
    const timeline = createTimelime();
    const emitter = await load(fx, uavResources);

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


    async function shadowReload(fxNext: IPartFxInstruction): Promise<boolean> {
        if (fxHash(fxNext) !== fxHash(fx)) {
            return false;
        }

        verbose('emitter reloaded from the shadow');

        const emitter = await load(fxNext, uavResources);

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


export type Emitter = ReturnType<typeof createEmitter>;
export type Pass = IPass;
