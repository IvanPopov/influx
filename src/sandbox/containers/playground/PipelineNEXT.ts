import { assert } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { createSLDocument } from '@lib/fx/SLDocument';
import { FxTranslator, ICSShaderReflection, IFxReflection, IUavReflection } from '@lib/fx/translators/FxTranslator';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';

/* tslint:disable:typedef */
/* tslint:disable:variable-name */
/* tslint:disable:member-ordering */

type IUAVResource = ReturnType<typeof VM.createUAV>;


function createUAVEx(document: ISLDocument, reflection: IUavReflection, length: number): IUAVResource {
    const elementSize = document.root.scope.findType(reflection.elementType).size; // in bytes
    return VM.createUAV(reflection.name, elementSize, length, reflection.register);
}

function createUAVsEx(document: ISLDocument, reflection: ICSShaderReflection, capacity: number, sharedUAVs: IUAVResource[] = []): IUAVResource[] {
    return reflection.uavs.map(uavReflection => {
        const shraredUAV = sharedUAVs.find(uav => uav.name == uavReflection.name);
        return shraredUAV || createUAVEx(document, uavReflection, capacity);
    });
}

function createBundle(document: ISLDocument, reflection: ICSShaderReflection): VM.Bundle {
    const shader = document.root.scope.findFunction(reflection.name, null);
    assert(shader);

    const program = Bytecode.translate(shader);
    return VM.load(program.code);
}

function setupBundle(document: ISLDocument, reflection: ICSShaderReflection, capacity: number, sharedUAVs: IUAVResource[]) {
    const bundle = createBundle(document, reflection);
    const uavs = createUAVsEx(document, reflection, capacity, sharedUAVs);
    uavs.forEach(uav => { bundle.input[uav.index] = uav.buffer; });

    // update shared uavs
    sharedUAVs.push(...uavs.filter(uav => sharedUAVs.indexOf(uav) === -1));

    function run(numthreads: number) {
        VM.dispatch(bundle, [numthreads, 1, 1]);
    }

    return {
        uavs,
        bundle,
        run
    };
}

async function Pipeline(fx: IPartFxInstruction) {
    const capacity = fx.capacity;
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    const textDocument = { uri: '://raw', source: emitter.toString() };
    const slDocument = await createSLDocument(textDocument);

    const uavResources: IUAVResource[] = [];
    const resetBundle = setupBundle(slDocument, reflection.CSParticlesResetRoutine, capacity, uavResources);
    const initBundle = setupBundle(slDocument, reflection.CSParticlesInitRoutine, capacity, uavResources);

    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavCeatetionRequests = uavResources.find(uav => uav.name === FxTranslator.UAV_CREATION_REQUESTS);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);

    const spawnRoutine = VM.asNativeFunction(fx.spawnRoutine.function);

    const numParticles = (): number => capacity - 1 - uavDeadIndices.readCounter();

    function reset() {
        // reset all available particles
        resetBundle.run(capacity);
        uavDeadIndices.overwriteCounter(capacity - 1);
    }

    function emit(npartices: number) {
        // TODO: move creation to GPU side
        uavCeatetionRequests.data.fill(1, 0, npartices * 2); // fill requests fro N groups, with 1 thread inside
        initBundle.run(npartices);
    }

    function dumpParticles() {
        const npart = numParticles();
        const partSize = fx.particle.size;

        console.log(`particles total: ${npart} (${uavDeadIndices.readCounter()}/${capacity})`);
        
        uavStates.data.forEach((alive, iPart) => {
            if (!alive) return;
            const partRaw = new Uint8Array(uavParticles.data.buffer, uavParticles.data.byteOffset + iPart * partSize, partSize);
            console.log(iPart, VM.asNative(partRaw, fx.particle));
        });
    }

    
    reset();
    emit(spawnRoutine());
    dumpParticles();

    // VM.play(bundle)

    return {
        reset,
        emit,
        dumpParticles
    };
}


export default Pipeline;
export type IPipeline = ReturnType<typeof Pipeline>;