import { assert, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import { FxTranslator } from '@lib/fx/translators/FxTranslator';
import { Bundle, BundleT, EPartRenderRoutines, EPartSimRoutines, RoutineBytecodeBundleT, RoutineGLSLBundleT, UAVBundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as Bytecode from "@lib/idl/bytecode";
import { IMap } from '@lib/idl/IMap';
import { Vector3 } from 'three';
import * as PipelineCpp from './cpp/bridge';
import { IEmitter, IPass } from './idl/IEmitter';
import * as flatbuffers from 'flatbuffers';

// TODO: use CDL instead of reflection

/* tslint:disable:typedef */
/* tslint:disable:variable-name */
/* tslint:disable:member-ordering */

type IUAVResource = ReturnType<typeof VM.createUAV>;


function createUAVEx(bundle: UAVBundleT, capacity: number): IUAVResource {
    const uav = VM.createUAV(<string>bundle.name, bundle.stride, capacity, bundle.slot);
    console.log(`UAV '${uav.name}' (counter value: ${UAV.readCounter(uav)}, size: ${uav.length}) has been created.`);
    return uav;
}

// tslint:disable-next-line:max-line-length
function createUAVsEx(bundles: UAVBundleT[], capacity: number, sharedUAVs: IUAVResource[] = []): IUAVResource[] {
    return bundles.map(uavBundle => {
        const shraredUAV = sharedUAVs.find(uav => uav.name === uavBundle.name);
        return shraredUAV || createUAVEx(uavBundle, capacity);
    });
}


function setupFxRoutineBytecodeBundle(debugName: string, rountineBundle: RoutineBytecodeBundleT, capacity: number, sharedUAVs: IUAVResource[]) {
    const vmBundle = VM.make(debugName, rountineBundle.code);
    const uavs = createUAVsEx(rountineBundle.resources.uavs, capacity, sharedUAVs);
    const numthreads = rountineBundle.numthreads;

    // setup VM inputs
    uavs.forEach(uav => { vmBundle.setInput(uav.index, uav.buffer); });

    // update shared uavs
    sharedUAVs.push(...uavs.filter(uav => sharedUAVs.indexOf(uav) === -1));

    function setConstants(constants: IMap<number>) {
        Object.keys(constants)
            .forEach(name => vmBundle.setConstant(name, constants[name]));
    }

    assert(numthreads[0] >= 1 && numthreads[1] === 1 && numthreads[2] === 1);

    function run(numgroups: number) {
        vmBundle.dispatch({ x: numgroups, y: 1, z: 1 }, { x: numthreads[0], y: numthreads[1], z: numthreads[2] });
    }

    return {
        uavs,
        bundle: vmBundle,
        run,
        setConstants,
        groupsizex: numthreads[0]
    };
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

    let $n = 0;
    function tick() {
        if (!active) {
            return;
        }

        const dt = Date.now() - startTime;
        constants.elapsedTime = (dt - elapsedTimeLevel) / 1000;
        constants.elapsedTimeLevel = elapsedTimeLevel / 1000;
        elapsedTimeLevel = dt;

        // if ($n == 10)
        //     stop();
        // else $n++;
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

const UAV = {
    overwriteCounter(uav: Bytecode.IUAV, value: number) {
        VM.memoryToI32Array(uav.buffer)[0] = value;
    },

    readCounter(uav: Bytecode.IUAV): number {
        return VM.memoryToI32Array(uav.buffer)[0];
    },

    readElement({ data, elementSize }: Bytecode.IUAV, iElement: number): Uint8Array {
        const u8a = VM.memoryToU8Array(data);
        return new Uint8Array(u8a.buffer, u8a.byteOffset + iElement * elementSize, elementSize);
    }
};

// tslint:disable-next-line:max-func-body-length
async function loadFromBundle(bundle: BundleT, uavResources: IUAVResource[]) {
    const { name, content: { capacity, particle, simulationRoutines, renderPasses } } = bundle;

    const resetBundle = setupFxRoutineBytecodeBundle(`${name}/reset`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Reset], capacity, uavResources);
    const initBundle = setupFxRoutineBytecodeBundle(`${name}/init`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Init], capacity, uavResources);
    const updateBundle = setupFxRoutineBytecodeBundle(`${name}/update`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Update], capacity, uavResources);
    const spawnBundle = setupFxRoutineBytecodeBundle(`${name}/spawn`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Spawn], 4, uavResources);

    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);
    const uavInitArguments = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS);

    const passes = renderPasses.map((pass, i): IPassEx => {
        const {
            routines,
            geometry,
            sorting,
            instanceCount,
            instance,
            stride
        } = pass;
        
        const UAV_PRERENDERED = `uavPrerendered${i}`;

        const prerender = routines[EPartRenderRoutines.k_Prerender];
        const bundle = setupFxRoutineBytecodeBundle(`${name}/prerender`, <RoutineBytecodeBundleT>prerender, capacity * instanceCount, uavResources);
        const uav = bundle.uavs.find(uav => uav.name === UAV_PRERENDERED);

        const vertexShader = <string>routines[EPartRenderRoutines.k_Vertex].code;
        const pixelShader = <string>routines[EPartRenderRoutines.k_Pixel].code;

        // note: only GLSL routines are supported!
        const instanceLayout = (<RoutineGLSLBundleT>routines[EPartRenderRoutines.k_Vertex]).attributes;

        const numRenderedParticles = () => numParticles() * instanceCount;

        // tslint:disable-next-line:max-line-length
        const uavPrerendReflect: UAVBundleT = (<RoutineBytecodeBundleT>prerender).resources.uavs.find(uavReflection => uavReflection.name === UAV_PRERENDERED);

        // dump prerendered particles
        const dump = (): void => {
            verbose(`dump ${UAV.readCounter(uav)}/${capacity} prerendred particles: `);
            for (let iElement = 0; iElement < UAV.readCounter(uav); ++iElement) {
                verbose(VM.asNativeRaw(UAV.readElement(uav, iElement), instance));
            }
        };

        //
        // Sorting
        //

        const uavNonSorted = uav;
        const uavPrerendReflectSorted = new UAVBundleT(`${uavPrerendReflect.name}Sorted`, uavPrerendReflect.slot, uavPrerendReflect.stride, uavPrerendReflect.type);
        const uavSorted = !sorting ? uavNonSorted : createUAVsEx([uavPrerendReflectSorted], capacity, uavResources)[0];

        const uavNonSortedU8 = VM.memoryToU8Array(uavNonSorted.data);
        const uavSortedU8 = VM.memoryToU8Array(uavSorted.data);

        function sort(targetPos: Vector3) {
            assert(sorting);

            // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
            //       I hate javascript for that :/

            const v3 = new Vector3();
            const length = numRenderedParticles();

            const nStride = stride * instanceCount; // stride in floats

            assert(uavSortedU8.byteLength >> 2 === nStride * capacity);

            const src = new Float32Array(uavNonSortedU8.buffer, uavNonSortedU8.byteOffset, uavNonSortedU8.byteLength >> 2);
            const dst = new Float32Array(uavSortedU8.buffer, uavSortedU8.byteOffset, uavSortedU8.byteLength >> 2);

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

        const data = uavSortedU8;
        return {
            data,
            instanceLayout: instanceLayout.map(({ name, offset, size }) => ({ name: <string>name, offset, size })), // FIXME
            stride,
            geometry: <string>geometry,                                                                             // FIXME
            sorting,
            vertexShader,
            pixelShader,
            length: numRenderedParticles,                                                                           // FIXME
            sort,
            bundle,
            dump
        };
    });

    const numParticles = () => capacity - UAV.readCounter(uavDeadIndices);

    function reset() {
        // reset all available particles
        resetBundle.run(Math.ceil(capacity / resetBundle.groupsizex));
        UAV.overwriteCounter(uavDeadIndices, capacity);
    }


    function update(timeline: ITimeline) {
        updateBundle.setConstants(timeline.constants);
        updateBundle.run(Math.ceil(capacity / updateBundle.groupsizex));
    }


    function prerender(timelime: ITimeline) {
        passes.forEach(({ bundle }, i) => {
            const uavPrerendered = bundle.uavs.find(uav => uav.name === `uavPrerendered${i}`);
            UAV.overwriteCounter(uavPrerendered, 0);
            bundle.setConstants(timelime.constants);
            bundle.run(Math.ceil(capacity / bundle.groupsizex));
        });
    }


    function destroy()
    {
        uavResources.forEach(uav => {
            VM.destroyUAV(uav);
            verbose(`UAV '${uav.name}' has been destroyed.`);
        });
        verbose(`emitter '${name}' has been dropped.`);
    }

    function emit(timeline: ITimeline) {
        initBundle.setConstants(timeline.constants);
        // console.log('emit >>', uavInitArguments.data[0],
        //     (new Float32Array(uavInitArguments.data.buffer, uavInitArguments.data.byteOffset))[3],
        //     (new Float32Array(uavInitArguments.data.buffer, uavInitArguments.data.byteOffset))[4]);
        initBundle.run(VM.memoryToI32Array(uavInitArguments.data)[0]);

        spawnBundle.setConstants(timeline.constants);
        spawnBundle.run(1);
        // console.log(spawnBundle.uavs, timeline.constants.elapsedTime);
        return;
    }


    function dump() {
        const npart = numParticles();
        const partSize = particle.size;

        verbose(`particles total: ${npart} ( ${UAV.readCounter(uavDeadIndices)}/${capacity} )`);

        const uavStatesI32 = VM.memoryToI32Array(uavStates.data);
        const uavParticlesU8 = VM.memoryToU8Array(uavParticles.data);

        uavStatesI32.forEach((alive, iPart) => {
            if (alive) {
                const partRaw = new Uint8Array(uavParticlesU8.buffer, uavParticlesU8.byteOffset + iPart * partSize, partSize);
                verbose(iPart, VM.asNativeRaw(partRaw, particle));
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
        dump,
        destroy
    };
}


// tslint:disable-next-line:max-func-body-length 
export async function createEmitterFromBundle(data: Uint8Array | BundleT): Promise<IEmitter> {
    let fx: BundleT = null;

    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array)
    {
        fx = new BundleT(); 
        let buf = new flatbuffers.ByteBuffer(data);
        Bundle.getRootAsBundle(buf).unpackTo(fx);

        PipelineCpp.make(data);

    } else {
        fx = <BundleT>data;
    }

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
        dump,
        destroy
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


    async function shadowReload(fxNext: BundleT): Promise<boolean> {
        if (!FxBundle.comparePartFxBundles(fxNext.content, fx.content)) {
            return false;
        }

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
        get name(): string {
            return <string>name;
        },

        capacity,

        start,
        stop,
        tick,
        isStopped,
        length: numParticles,
        passes,

        reset,
        shadowReload,

        dump,

        destroy
    };
}

