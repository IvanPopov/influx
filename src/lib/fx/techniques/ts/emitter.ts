import { assert, verbose } from '@lib/common';
import * as VM from '@lib/fx/bytecode/VM';
import { asBundleMemory } from '@lib/fx/bytecode/VM/ts/bundle';
import { FxTranslator } from '@lib/fx/translators/FxTranslator';
import * as Bytecode from "@lib/idl/bytecode";
import { IEmitter } from '@lib/idl/emitter';
import { Uniforms } from '@lib/idl/Uniforms';

import { SRV0_REGISTER } from '@lib/fx/bytecode/Bytecode';
import { IParticleDebugViewer, ITexture, ITextureDesc, ITrimesh, ITrimeshDesc } from '@lib/idl/emitter/IEmitter';
import { EUsage, IConstantBuffer } from '@lib/idl/ITechnique';
import { IMap } from '@lib/idl/IMap';

import { UAVBundleT } from '@lib/idl/bundles/auto/fx/uavbundle';
import { TypeLayoutT } from '@lib/idl/bundles/auto/type-layout';
import { RoutineBytecodeBundleT } from '@lib/idl/bundles/auto/fx/routine-bytecode-bundle';
import { EPartSimRoutines } from '@lib/idl/bundles/auto/fx/epart-sim-routines';
import { BundleT } from '@lib/idl/bundles/auto/fx/bundle';
import { PartBundleT } from '@lib/idl/bundles/auto/fx/part-bundle';
import { RoutineShaderBundleT } from '@lib/idl/bundles/auto/fx/routine-shader-bundle';
import { EPartRenderRoutines } from '@lib/idl/bundles/auto/fx/epart-render-routines';
import { RoutineGLSLSourceBundleT } from '@lib/idl/bundles/auto/fx/routine-glslsource-bundle';
import { RoutineSourceBundle } from '@lib/idl/bundles/auto/fx/routine-source-bundle';

type IMemory = Bytecode.IMemory;
type IUAVResource = ReturnType<typeof VM.createUAV>;

interface TSTrimesh extends ITrimesh {
    vertCount: number;
    faceCount: number;

    vertices: IMemory;
    faces: IMemory;
    indicesAdj: IMemory;
    faceAdj: IMemory;
}

interface TSTexture extends ITexture {
    layout: IMemory;
}

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

const CTEMP_U8 = new Uint8Array(8);
const CTEMP_DV = new DataView(CTEMP_U8.buffer);



function createParticleDebugViewer(
    layout: TypeLayoutT,
    capacity: number,
    uavDeadIndices: Bytecode.IUAV,
    uavStates: Bytecode.IUAV,
    uavParticles: Bytecode.IUAV
): IParticleDebugViewer {

    const dataU8 = new Uint8Array(layout.size * capacity);
    const dataIds = new Array(capacity);

    function dump() {
        const npart = getParticleCount();

        // verbose(`particles total: ${npart} ( ${UAV.readCounter(uavDeadIndices)}/${capacity} )`);

        const uavStatesI32 = VM.memoryToI32Array(uavStates.data);
        const uavParticlesU8 = VM.memoryToU8Array(uavParticles.data);

        let iCopy = 0;
        uavStatesI32.forEach((alive, iPart) => {
            if (alive) {
                const src = new Uint8Array(uavParticlesU8.buffer, uavParticlesU8.byteOffset + iPart * layout.size, layout.size);
                const dst = new Uint8Array(dataU8.buffer, dataU8.byteOffset + iCopy * layout.size, layout.size);
                dst.set(src);
                dataIds[iCopy] = iPart;
                iCopy ++;
            }
        });
    }

    const getParticleCount = () => capacity - UAV.readCounter(uavDeadIndices);
    const isDumpReady = () => true;
    // const getLayout = () => layout;

    function readParticleJSON(iPart: number): Object {
        const src = new Uint8Array(dataU8.buffer, dataU8.byteOffset + iPart * layout.size, layout.size);
        return VM.asNativeRaw(src, layout);
    }

    function readParticlesJSON(): Array<Object> {
        let dst = [];
        for (let i = 0; i < getParticleCount(); ++ i) {
            dst.push({ ...readParticleJSON(i), [`#id`]: dataIds[i] } );
        }
        return dst;
    }

    return {
        dump,
        isDumpReady,
        getParticleCount,
        readParticleJSON,
        readParticlesJSON
    };
}


function setupFxRoutineBytecodeBundle(debugName: string, routineBundle: RoutineBytecodeBundleT, capacity: number, sharedUAVs: IUAVResource[]) {
    const codeLength = routineBundle.code.length;
    if (codeLength == 0) {
        // it's dummy bundle
        return null;
    }

    const vmBundle = VM.make(debugName, routineBundle.code);
    const uavs = createUAVsEx(routineBundle.resources.uavs, capacity, sharedUAVs);
    const numthreads = routineBundle.numthreads;

    uavs.forEach(uav => { vmBundle.setInput(uav.index, uav.buffer); });

    const { buffers, textures, trimeshes } = routineBundle.resources;

    function setConstant(name: string, value: Uint8Array) {
        vmBundle.setConstant(name, value);
    }

    function setInt32Constant(name: string, value: number) {
        CTEMP_DV.setInt32(0, value, true);
        setConstant(name, CTEMP_U8);
    }

    function setUint32Constant(name: string, value: number) {
        CTEMP_DV.setUint32(0, value, true);
        setConstant(name, CTEMP_U8);
    }

    function setConstants(constants: Uniforms) {
        Object.keys(constants)
            .forEach(name => setConstant(name, constants[name]));
    }


    function setBuffer(name, data: IMemory) {
        const buf = buffers.find(buf => buf.name === name);
        if (!buf) return;

        vmBundle.setInput(buf.slot + SRV0_REGISTER, data);
    }


    // content consist of Float32Array(...f3 pos, f3 normal, f2 uv)
    function setTrimesh(name: string, trimesh: ITrimesh) {
        const { vertCount, faceCount, vertices, faces, indicesAdj, faceAdj } = <TSTrimesh>trimesh;

        const mesh = trimeshes.find(mesh => mesh.name === name);
        if (!mesh) return;

        setBuffer(mesh.verticesName, vertices);
        setBuffer(mesh.facesName, faces);
        setBuffer(mesh.gsAdjecencyName, indicesAdj);
        setBuffer(mesh.faceAdjacencyName, faceAdj);

        setUint32Constant(<string>mesh.vertexCountUName, vertCount);
        setUint32Constant(<string>mesh.faceCountUName, faceCount);
    }

    function setTexture(name: string, tex: ITexture) {
        const { layout } = <TSTexture>tex;
        const texture = textures.find(tex => tex.name === name);
        if (!texture) return;
        vmBundle.setInput(texture.slot + SRV0_REGISTER, layout);
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
        setInt32Constant,
        setUint32Constant,

        setTrimesh,
        setTexture,

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

    minidump(uav: Bytecode.IUAV): void {
        const { name, length, elementSize, register, data } = uav;
        // std::cout << "--------------------------------------" << std::endl;
        console.log(` uav ${name}[${length}x${elementSize}:r${register}:cnt(${UAV.readCounter(uav)})]`);

        const u8a = VM.memoryToU8Array(data);
        let n = Math.min(64, length * elementSize);
        let sout = '';
        for (let i = 0; i < n; ++i) {
            sout += `${u8a[i].toString(16)} `;
        }
        sout += '...';
        console.log(sout);
        // std::cout << "--------------------------------------" << std::endl;
    }
};



// tslint:disable-next-line:max-func-body-length
function createEmiterFromBundle(bundle: BundleT, uavResources: IUAVResource[]): IEmitter {
    const { name, content } = bundle;
    const { capacity, particle, simulationRoutines, renderPasses } = content as PartBundleT;

    const resetBundle = setupFxRoutineBytecodeBundle(`${name}/reset`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Reset], capacity, uavResources);
    const initBundle = setupFxRoutineBytecodeBundle(`${name}/init`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Init], capacity, uavResources);
    const updateBundle = setupFxRoutineBytecodeBundle(`${name}/update`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Update], capacity, uavResources);
    const spawnBundle = setupFxRoutineBytecodeBundle(`${name}/spawn`, <RoutineBytecodeBundleT>simulationRoutines[EPartSimRoutines.k_Spawn], 4, uavResources);

    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);
    const uavInitArguments = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_DISPATCH_ARGUMENTS);
    const uavCreationRequests = uavResources.find(uav => uav.name === FxTranslator.UAV_CREATION_REQUESTS);
    const uavSpawnEmitter = uavResources.find(uav => uav.name === FxTranslator.UAV_SPAWN_EMITTER);

    function preparePrerender() {
        passes.forEach((p, i) => {
            p.preparePrerender();
        });
    }

    const passes = renderPasses.map((pass, i) => {
        const {
            routines,
            geometry,
            sorting,
            instanceCount,
            instance,
            stride,
            renderStates
        } = pass;

        const UAV_PRERENDERED = `${FxTranslator.UAV_PRERENDERED}${i}`;
        const UAV_SERIALS = `${FxTranslator.UAV_SERIALS}${i}`;

        const prerenderBundle = routines[EPartRenderRoutines.k_Prerender];
        const bundle = setupFxRoutineBytecodeBundle(`${name}/prerender`, <RoutineBytecodeBundleT>prerenderBundle, capacity * instanceCount, uavResources);

        const uavPrerendered = uavResources.find(uav => uav.name === UAV_PRERENDERED);
        const uavSerials = uavResources.find(uav => uav.name === UAV_SERIALS);

        const vertexBundle = <RoutineShaderBundleT>routines[EPartRenderRoutines.k_Vertex];
        const vertexGLSLBundle = <RoutineGLSLSourceBundleT>vertexBundle.shaders.find((shader, i) => vertexBundle.shadersType[i] === RoutineSourceBundle.RoutineGLSLSourceBundle);

        const pixelBundle = <RoutineShaderBundleT>routines[EPartRenderRoutines.k_Pixel];
        const pixelGLSLBundle = <RoutineGLSLSourceBundleT>pixelBundle.shaders.find((shader, i) => pixelBundle.shadersType[i] === RoutineSourceBundle.RoutineGLSLSourceBundle);

        const vertexShader = <string>vertexGLSLBundle.code;
        const pixelShader = <string>pixelGLSLBundle.code;
        const instanceLayout = vertexGLSLBundle.attributes;

        const getNumRenderedParticles = () => UAV.readCounter(uavPrerendered) * instanceCount;

        // if no prerender bundle then all particles must be prerendered within update stage
        // looking for prerendered reflection among prerender or update routine uavs
        const uavPrerendReflect: UAVBundleT = (<RoutineBytecodeBundleT>(bundle ? routines[EPartRenderRoutines.k_Prerender] : simulationRoutines[EPartSimRoutines.k_Update]))
            .resources.uavs.find(uavReflection => uavReflection.name === UAV_PRERENDERED);

        const cbufs: IMap<IConstantBuffer> = {};
        const scanCbuffer = (sharedCbufs: IMap<IConstantBuffer>, bundle: RoutineGLSLSourceBundleT, usage: EUsage) => {
            for (let { name, slot, size, fields } of bundle.cbuffers) {
                // skip same name buffers
                const cbuf = sharedCbufs[`${name}`] ||= {
                    name: `${name}`,
                    slot,
                    size,
                    usage,
                    fields: fields.map(({ name, semantic, size, padding, type: { length } }) =>
                    ({
                        name: `${name}`,
                        semantic: `${semantic || name}`,
                        size,
                        padding,
                        length
                    }))
                };
                cbuf.usage |= usage;
            }
        };

        // merge VS & PS constant buffer into shared list 
        // it's guaranteed by translator that buffers with the same name are the same
        scanCbuffer(cbufs, vertexGLSLBundle, EUsage.k_Vertex);
        scanCbuffer(cbufs, pixelGLSLBundle, EUsage.k_Pixel);

        const cbuffers = Object.values(cbufs);

        //
        // Sorting
        //

        const uavNonSorted = uavPrerendered;
        // share memory with WASM bundle if used
        const uavNonSortedU8 = VM.memoryToU8Array(uavNonSorted.data);

        let uavPrerendReflectSorted: UAVBundleT = null;
        let uavSorted: Bytecode.IUAV = null;
        let uavSortedU8: Uint8Array = null;
        let uavSerialsI32: Int32Array = null;

        if (sorting) {
            uavPrerendReflectSorted = new UAVBundleT(`${uavPrerendReflect.name}Sorted`, uavPrerendReflect.slot, uavPrerendReflect.stride, uavPrerendReflect.type);
            uavSorted = createUAVsEx([uavPrerendReflectSorted], capacity * instanceCount, uavResources)[0];
            uavSortedU8 = VM.memoryToU8Array(uavSorted.data);
            uavSerialsI32 = VM.memoryToI32Array(uavSerials.data);
        }


        // dump prerendered particles
        const dump = (): void => {
            let nPart = getNumRenderedParticles();
            verbose(`dump ${nPart}/${capacity} prerendred particles: `);
            for (let iElement = 0; iElement < nPart; ++iElement) {
                verbose(VM.asNativeRaw(UAV.readElement(uavNonSorted, iElement), instance));
            }
        };


        function serialize() {
            if (!sorting) {
                return;
            }

            const nStrideF32 = stride * instanceCount; // stride in floats

            assert(uavSortedU8.byteLength >> 2 === nStrideF32 * capacity);

            const srcF32 = new Float32Array(uavNonSortedU8.buffer, uavNonSortedU8.byteOffset, uavNonSortedU8.byteLength >> 2);
            const dstF32 = new Float32Array(uavSortedU8.buffer, uavSortedU8.byteOffset, uavSortedU8.byteLength >> 2);

            const indicies = [];

            // todo: sort inplace using serials pairs
            for (let iPart = 0; iPart < UAV.readCounter(uavPrerendered); ++iPart) {
                const sortIndex = uavSerialsI32[iPart * 2 + 0];
                const partIndex = uavSerialsI32[iPart * 2 + 1];
                indicies.push([partIndex, sortIndex]);
            };
            indicies.sort((a, b) => -a[1] + b[1]);

            for (let i = 0; i < indicies.length; ++i) {
                const iFrom = indicies[i][0] * nStrideF32;
                const iTo = i * nStrideF32;

                const from = srcF32.subarray(iFrom, iFrom + nStrideF32);
                const copyTo = dstF32.subarray(iTo, iTo + nStrideF32);
                copyTo.set(from);
            }
        }

        function getData() { return asBundleMemory(sorting ? uavSortedU8 : uavNonSortedU8); }
        function getDesc() {
            const states = {};
            renderStates.forEach(({ type, value }) => { states[type] = value; });
            return {
                instanceName: instance.name as string,
                instanceLayout: instanceLayout.map(({ name, offset, size }) => ({ name: <string>name, offset, size })), // FIXME
                stride,
                geometry: <string>geometry,                                                                             // FIXME
                sorting,
                vertexShader,
                pixelShader,
                renderStates: states,
                cbuffers
            };
        }


        function preparePrerender() {
            if (uavPrerendered) {
                UAV.overwriteCounter(uavPrerendered, 0);
            }
            if (uavSerials) {
                UAV.overwriteCounter(uavSerials, 0);
            }
        }


        function prerender(uniforms: Uniforms) {
            if (!bundle) {
                // manual prerender is used
                return;
            }

            // simulation could be omitted (effect is paused for ex.) 
            // but prerender counters still have to be dropped
            // if we want to continue prerender every frame
            preparePrerender();
            bundle.setConstants(uniforms);
            bundle.run(Math.ceil(capacity / bundle.groupsizex));
        }


        function setTexture(name: string, tex: ITexture) {
            bundle.setTexture(name, tex);
        }


        function setTrimesh(name: string, mesh: ITrimesh) {
            bundle?.setTrimesh(name, mesh);
        }


        return {
            getDesc,
            getData,
            getNumRenderedParticles,                                                                           // FIXME
            setTexture,
            setTrimesh,
            serialize,
            preparePrerender,
            prerender,
            dump
        };
    });

    const getNumParticles = () => capacity - UAV.readCounter(uavDeadIndices);
    const getName = () => <string>name;
    const getType = (): 'emitter' => 'emitter';
    const getPassCount = () => passes.length;
    const getPass = (i: number) => passes[i];
    const getCapacity = () => capacity;


    function setTrimesh(name: string, mesh: ITrimesh) {
        spawnBundle.setTrimesh(name, mesh);
        initBundle.setTrimesh(name, mesh);
        updateBundle.setTrimesh(name, mesh);
        passes.forEach(pass => pass.setTrimesh(name, mesh));
    }


    function setTexture(name: string, tex: ITexture): void {
        spawnBundle.setTexture(name, tex);
        initBundle.setTexture(name, tex);
        updateBundle.setTexture(name, tex);
        passes.forEach(pass => pass.setTexture(name, tex));
    }

    function reset() {
        // reset all available particles
        resetBundle.run(Math.ceil(capacity / resetBundle.groupsizex));
        UAV.overwriteCounter(uavDeadIndices, capacity);
    }


    function update(uniforms: Uniforms) {
        // drop prerender counters all the time before update
        // because some effects may use "draw" operator
        // which means that simulation and preprender are mixed
        preparePrerender();

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

    function simulate(uniforms: Uniforms) {
        update(uniforms);
        emit(uniforms);
    }

    /** @deprecated */
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

    function createDebugViewer() {
        return createParticleDebugViewer(
            particle, 
            capacity, 
            uavDeadIndices, 
            uavStates, 
            uavParticles
        );
    }

    return {
        // abstract interface
        getType,
        getName,
        getCapacity,
        getPassCount,
        getPass,
        getNumParticles,

        reset,
        simulate,
        prerender,
        serialize,

        setTrimesh,
        setTexture,

        dump,
        createDebugViewer
    };
}

type TSEmitter = ReturnType<typeof createTsEmitter>;

function compareFxTypeLayouts(left: TypeLayoutT, right: TypeLayoutT) {
    return JSON.stringify(left) == JSON.stringify(right);
}

// function compareFxControls(left: UIControlT[], right: UIControlT[]) {
//     return JSON.stringify(left) == JSON.stringify(right);
// }

// todo: rework comparisson to be more readable and compact
function comparePartFxBundles(left: PartBundleT, right: PartBundleT): boolean {
    if (left.capacity != right.capacity) return false;
    if (left.renderPasses.length != right.renderPasses.length) return false;
    if (!compareFxTypeLayouts(left.particle, right.particle)) return false;
    for (let i = 0; i < left.renderPasses.length; ++i) {
        if (left.renderPasses[i].geometry != right.renderPasses[i].geometry) return false;
        if (left.renderPasses[i].sorting != right.renderPasses[i].sorting) return false;
        if (left.renderPasses[i].instanceCount != right.renderPasses[i].instanceCount) return false;
        if (!compareFxTypeLayouts(left.renderPasses[i].instance, right.renderPasses[i].instance)) return false;
    }
    return true;
}

export function copyTsEmitter(dst: IEmitter, src: IEmitter): boolean {
    if (comparePartFxBundles((<TSEmitter>dst).bundle.content as PartBundleT, (<TSEmitter>src).bundle.content as PartBundleT)) {
        (<TSEmitter>dst).uavResources.forEach((uav, i) =>
            VM.memoryToU8Array(uav.buffer).set(VM.memoryToU8Array((<TSEmitter>src).uavResources[i].buffer)));
        return true;
    }
    return false;
}

export function destroyTsEmitter(emitter: IEmitter): void {
    let { uavResources } = <TSEmitter>emitter;
    uavResources.forEach(uav => {
        VM.destroyUAV(uav);
        // verbose(`UAV '${uav.name}' has been destroyed.`);
    });
    verbose(`emitter '${emitter.getName()}' has been dropped.`);
}

export function createTsEmitter(bundle: BundleT) {
    let uavResources: Bytecode.IUAV[] = [];
    let newly = createEmiterFromBundle(bundle, uavResources);
    return { bundle, uavResources, ...newly };
}


export function createTsTexture({ width, height }: ITextureDesc, data: ArrayBufferView): TSTexture {
    const DESCRIPTOR_SIZE = 64;
    const bytesPerPixel = 4;
    const size = bytesPerPixel * width * height;
    const layout = new Uint8Array(DESCRIPTOR_SIZE + size);
    const dest = layout.subarray(DESCRIPTOR_SIZE);
    if (data) {
        assert(data.byteLength === size);
        const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        dest.set(src);
    } else {
        dest.fill(0);
    }

    const desc = new DataView(layout.buffer, 0, DESCRIPTOR_SIZE);
    desc.setInt32(0, width, true);
    desc.setInt32(4, height, true);
    // set format R8G8B8A8 == 0
    desc.setInt32(8, 0, true);

    return { layout: VM.copyViewToMemory(layout) };
}


export function destroyTsTexture(texture: ITexture): void {
    const { layout } = texture as TSTexture;
    VM.releaseMemory(layout);
    verbose(`texture has been dropped.`);
}


export function createTsTrimesh(desc: ITrimeshDesc,
    vertices: ArrayBufferView, faces: ArrayBufferView,
    indicesAdj: ArrayBufferView, faceAdj: ArrayBufferView): TSTrimesh {
    const { vertCount, faceCount } = desc;
    return {
        vertCount,
        faceCount,
        vertices: VM.copyViewToMemory(vertices),
        faces: VM.copyViewToMemory(faces),
        indicesAdj: VM.copyViewToMemory(indicesAdj),
        faceAdj: VM.copyViewToMemory(faceAdj)
    };
}


export function destroyTsTrimesh(mesh: ITrimesh) {
    const { vertices, faces, indicesAdj, faceAdj } = mesh as TSTrimesh;
    VM.releaseMemory(vertices);
    VM.releaseMemory(faces);
    VM.releaseMemory(indicesAdj);
    VM.releaseMemory(faceAdj);
}
