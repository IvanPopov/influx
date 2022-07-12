import { assert, verbose } from '@lib/common';
import * as VM from '@lib/fx/bytecode/VM';
import { FxTranslator } from '@lib/fx/translators/FxTranslator';
import { BundleT, EPartRenderRoutines, EPartSimRoutines, PartBundleT, RoutineBytecodeBundleT, RoutineGLSLBundleT, TypeLayoutT, UAVBundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as Bytecode from "@lib/idl/bytecode";
import {  Uniforms, IEmitter, IEmitterPass } from '@lib/idl/emitter';
import { Vector3 } from 'three';
import { asBundleMemory } from '@lib/fx/bytecode/VM/ts/bundle';
import * as FxBundle from '@lib/fx/bundles/Bundle';


type IUAVResource = ReturnType<typeof VM.createUAV>;

function createUAVEx(bundle: UAVBundleT, capacity: number): IUAVResource {
    const uav = VM.createUAV(<string>bundle.name, bundle.stride, capacity, bundle.slot);
    // console.log(`UAV '${uav.name}' (counter value: ${UAV.readCounter(uav)}, size: ${uav.length}) has been created.`);
    return uav;
}

// tslint:disable-next-line:max-line-length
// !attention! updtae shared list if needed
function createUAVsEx(bundles: UAVBundleT[], capacity: number, sharedUAVs: IUAVResource[] = []): IUAVResource[] {
    return bundles.map(uavBundle => {
        const sharedUAV = sharedUAVs.find(uav => uav.name === uavBundle.name);
        if (sharedUAV) return sharedUAV;
        const uav = createUAVEx(uavBundle, capacity);
        sharedUAVs.push(uav);
        return uav;
    });
}


function setupFxRoutineBytecodeBundle(debugName: string, routineBundle: RoutineBytecodeBundleT, capacity: number, sharedUAVs: IUAVResource[]) {
    const vmBundle = VM.make(debugName, routineBundle.code);
    const uavs = createUAVsEx(routineBundle.resources.uavs, capacity, sharedUAVs);
    const numthreads = routineBundle.numthreads;

    // setup VM inputs
    uavs.forEach(uav => { vmBundle.setInput(uav.index, uav.buffer); });

    function setConstants(constants: Uniforms) {
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
    },

    minidump(uav: Bytecode.IUAV): void
    {
        const { name, length, elementSize, register, data } = uav;
        // std::cout << "--------------------------------------" << std::endl;
        console.log(` uav ${name}[${length}x${elementSize}:r${register}:cnt(${UAV.readCounter(uav)})]`);
        
        const u8a = VM.memoryToU8Array(data);
        let n = Math.min(64, length * elementSize);
        let sout = '';
        for (let i = 0; i < n; ++ i)
        {
            sout += `${u8a[i].toString(16)} `;
        }
        sout += '...';
        console.log(sout);
        // std::cout << "--------------------------------------" << std::endl;
    }
};



// tslint:disable-next-line:max-func-body-length
function createEmiterFromBundle(bundle: BundleT, uavResources: IUAVResource[]): IEmitter {
    const { name, content: { capacity, particle, simulationRoutines, renderPasses } } = bundle;

    const resetBundle = setupFxRoutineBytecodeBundle(`${name}/reset`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Reset], capacity, uavResources);
    const initBundle = setupFxRoutineBytecodeBundle(`${name}/init`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Init], capacity, uavResources);
    const updateBundle = setupFxRoutineBytecodeBundle(`${name}/update`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Update], capacity, uavResources);
    const spawnBundle = setupFxRoutineBytecodeBundle(`${name}/spawn`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Spawn], 4, uavResources);

    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);
    const uavInitArguments = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS);
    const uavCreationRequests = uavResources.find(uav => uav.name === FxTranslator.UAV_CREATION_REQUESTS);

    const passes = renderPasses.map((pass, i) => {
        const {
            routines,
            geometry,
            sorting,
            instanceCount,
            instance,
            stride
        } = pass;

        const UAV_PRERENDERED = `${FxTranslator.UAV_PRERENDERED}${i}`;
        const UAV_SERIALS = `${FxTranslator.UAV_SERIALS}${i}`;

        const prerenderBundle = routines[EPartRenderRoutines.k_Prerender];
        const bundle = setupFxRoutineBytecodeBundle(`${name}/prerender`, <RoutineBytecodeBundleT>prerenderBundle, capacity * instanceCount, uavResources);
        
        const uavPrerendered = bundle.uavs.find(uav => uav.name === UAV_PRERENDERED);
        const uavSerials = bundle.uavs.find(uav => uav.name === UAV_SERIALS);

        const vertexShader = <string>routines[EPartRenderRoutines.k_Vertex].code;
        const pixelShader = <string>routines[EPartRenderRoutines.k_Pixel].code;

        // note: only GLSL routines are supported!
        const instanceLayout = (<RoutineGLSLBundleT>routines[EPartRenderRoutines.k_Vertex]).attributes;
        const getNumRenderedParticles = () => getNumParticles() * instanceCount;

        // tslint:disable-next-line:max-line-length
        const uavPrerendReflect: UAVBundleT = (<RoutineBytecodeBundleT>prerenderBundle).resources.uavs.find(uavReflection => uavReflection.name === UAV_PRERENDERED);

        //
        // Sorting
        //

        const uavNonSorted = uavPrerendered;
        const uavPrerendReflectSorted = new UAVBundleT(`${uavPrerendReflect.name}Sorted`, uavPrerendReflect.slot, uavPrerendReflect.stride, uavPrerendReflect.type);
        const uavSorted = createUAVsEx([uavPrerendReflectSorted], capacity * instanceCount, uavResources)[0];

        const uavNonSortedU8 = VM.memoryToU8Array(uavNonSorted.data);
        const uavSortedU8 = VM.memoryToU8Array(uavSorted.data);
        
        const uavStatesI32 = VM.memoryToI32Array(uavStates.data);
        const uavSerialsI32 = sorting ? VM.memoryToI32Array(uavSerials.data) : null;
        // const uavSerialsF32 = VM.memoryToF32Array(uavSerials.data);

        // dump prerendered particles
        const dump = (): void => {
            let nPart = getNumRenderedParticles();
            verbose(`dump ${nPart}/${capacity} prerendred particles: `);
            for (let iElement = 0; iElement < nPart; ++iElement) {
                verbose(VM.asNativeRaw(UAV.readElement(uavSorted, iElement), instance));
            }
        };

        function serialize() {

            // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
            //       I hate javascript for that :/

            const nStrideF32 = stride * instanceCount; // stride in floats

            assert(uavSortedU8.byteLength >> 2 === nStrideF32 * capacity);

            const srcF32 = new Float32Array(uavNonSortedU8.buffer, uavNonSortedU8.byteOffset, uavNonSortedU8.byteLength >> 2);
            const dstF32 = new Float32Array(uavSortedU8.buffer, uavSortedU8.byteOffset, uavSortedU8.byteLength >> 2);

            const indicies = [];

            for (let iPart = 0; iPart < capacity; ++iPart) 
            {
                const alive = uavStatesI32[iPart];
                if (alive) {
                    indicies.push([ iPart, sorting ? uavSerialsI32[iPart * instanceCount] : 0 ]);
                }
            };

            if (sorting)
            {
                indicies.sort((a, b) => -a[1] + b[1]);
            }

            for (let i = 0; i < indicies.length; ++i) {
                const iFrom = indicies[i][0] * nStrideF32;
                const iTo = i * nStrideF32;

                const from = srcF32.subarray(iFrom, iFrom + nStrideF32);
                const copyTo = dstF32.subarray(iTo, iTo + nStrideF32);
                copyTo.set(from);
            }
        }

        function getData() { return asBundleMemory(uavSortedU8); }
        function getDesc() {
            return {
                instanceName: instance.name as string,
                instanceLayout: instanceLayout.map(({ name, offset, size }) => ({ name: <string>name, offset, size })), // FIXME
                stride,
                geometry: <string>geometry,                                                                             // FIXME
                sorting,
                vertexShader,
                pixelShader,
            };
        }


        function prerender(uniforms: Uniforms)
        {
            const uavPrerendered = bundle.uavs.find(uav => uav.name === `uavPrerendered${i}`);
            UAV.overwriteCounter(uavPrerendered, 0);
            bundle.setConstants(uniforms);
            bundle.run(Math.ceil(capacity / bundle.groupsizex));
        }

        return {
            getDesc,
            getNumRenderedParticles,                                                                           // FIXME
            getData,
            serialize,
            prerender,
            dump
        };
    });

    const getNumParticles = () => capacity - UAV.readCounter(uavDeadIndices);
    const getName = () => <string>name;
    const getPassCount = () => passes.length;
    const getPass = (i: number) => passes[i];
    const getCapacity = () => capacity;

    function reset() {
        // reset all available particles
        resetBundle.run(Math.ceil(capacity / resetBundle.groupsizex));
        UAV.overwriteCounter(uavDeadIndices, capacity);
    }


    function update(uniforms: Uniforms) {
        updateBundle.setConstants(uniforms);
        updateBundle.run(Math.ceil(capacity / updateBundle.groupsizex));
    }


    function prerender(uniforms: Uniforms) {
        passes.forEach(pass => pass.prerender(uniforms));
    }

    function serialize() {
        passes.forEach(pass => pass.serialize());
    }


    function emit(uniforms: Uniforms) {
        initBundle.setConstants(uniforms);
        initBundle.run(VM.memoryToI32Array(uavInitArguments.data)[0]);

        spawnBundle.setConstants(uniforms);
        spawnBundle.run(1);
    }

    function simulate(uniforms: Uniforms)
    {
        update(uniforms);
        emit(uniforms);
    }

    function dump() {
        const npart = getNumParticles();
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
        // abstract interface
        getName,
        getCapacity,
        getPassCount,
        getPass,
        getNumParticles,
        
        reset,
        simulate,
        prerender,
        serialize,
        
        dump
    };
}

type TSEmitter = ReturnType<typeof createTsEmitter>;

function compareFxTypeLayouts(left: TypeLayoutT, right: TypeLayoutT) {
    return JSON.stringify(left) == JSON.stringify(right);
}

// todo: rework comparisson to be more readable and compact
function comparePartFxBundles(left: PartBundleT, right: PartBundleT): boolean {
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

export function copyTsEmitter(dst: IEmitter, src: IEmitter): boolean
{
    if (comparePartFxBundles((<TSEmitter>dst).bundle.content, (<TSEmitter>src).bundle.content)) 
    {
        (<TSEmitter>dst).uavResources.forEach((uav, i) =>
            VM.memoryToU8Array(uav.buffer).set(VM.memoryToU8Array((<TSEmitter>src).uavResources[i].buffer)));
        return true;
    }
    return false;
}

export function destroyTsEmitter(emitter: IEmitter): void 
{
    let { uavResources } = <TSEmitter>emitter;
    uavResources.forEach(uav => {
        VM.destroyUAV(uav);
        // verbose(`UAV '${uav.name}' has been destroyed.`);
    });
    verbose(`emitter '${name}' has been dropped.`);
}

export function createTsEmitter(bundle: BundleT)
{
    let uavResources: Bytecode.IUAV[] = [];
    let newly = createEmiterFromBundle(bundle, uavResources);
    return { bundle, uavResources, ...newly };
}
