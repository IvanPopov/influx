import { assert, verbose } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import { createSLDocument } from '@lib/fx/SLDocument';
import { FxTranslator, ICSShaderReflection, IFxReflection, IUavReflection } from '@lib/fx/translators/FxTranslator';
import { IMap } from '@lib/idl/IMap';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { time } from '@lib/time';

// TODO: use CDL instead of reflection

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

    function setConstants(constants: IMap<number>) {
        Object.keys(constants)
            .forEach(name => VM.setConstant(bundle, name, constants[name]));
    }

    function run(numthreads: number) {
        VM.dispatch(bundle, [numthreads, 1, 1]);
    }

    return {
        uavs,
        bundle,
        run,
        setConstants
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
        verbose('pipeline stopped');
    }

    function start() {
        constants.elapsedTime = 0;
        constants.elapsedTimeLevel = 0;

        startTime = Date.now();
        elapsedTimeLevel = 0;
        active = true;
        verbose('pipeline started');
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

// tslint:disable-next-line:max-func-body-length
async function Pipeline(fx: IPartFxInstruction) {
    const capacity = fx.capacity;
    const emitter = new FxTranslator();
    const reflection = emitter.emitPartFxDecl(fx);
    const textDocument = { uri: '://raw', source: emitter.toString() };
    const slDocument = await createSLDocument(textDocument);

    const uavResources: IUAVResource[] = [];
    const resetBundle = setupBundle(slDocument, reflection.CSParticlesResetRoutine, capacity, uavResources);
    const initBundle = setupBundle(slDocument, reflection.CSParticlesInitRoutine, capacity, uavResources);
    const updateBundle = setupBundle(slDocument, reflection.CSParticlesUpdateRoutine, capacity, uavResources);


    const uavDeadIndices = uavResources.find(uav => uav.name === FxTranslator.UAV_DEAD_INDICES);
    const uavCeatetionRequests = uavResources.find(uav => uav.name === FxTranslator.UAV_CREATION_REQUESTS);
    const uavParticles = uavResources.find(uav => uav.name === FxTranslator.UAV_PARTICLES);
    const uavStates = uavResources.find(uav => uav.name === FxTranslator.UAV_STATES);

    const spawnRoutine = VM.asNativeFunction(fx.spawnRoutine.function);

    const timeline = createTimelime();

    const numParticles = () => capacity - 1 - uavDeadIndices.readCounter();

    function reset() {
        // reset all available particles
        resetBundle.run(capacity);
        uavDeadIndices.overwriteCounter(capacity - 1);
    }

    function emit(nparticles: number) {
        // TODO: move creation to GPU side
        uavCeatetionRequests.data.fill(1, 0, nparticles * 2); // fill requests fro N groups, with 1 thread inside
        initBundle.setConstants(timeline.constants);
        initBundle.run(nparticles);
    }

    function update() {
        updateBundle.setConstants(timeline.constants);
        updateBundle.run(capacity);
    }

    function dumpParticles() {
        const npart = numParticles();
        const partSize = fx.particle.size;

        verbose(`particles total: ${npart} (${uavDeadIndices.readCounter()}/${capacity})`);

        uavStates.data.forEach((alive, iPart) => {
            if (alive) {
                const partRaw = new Uint8Array(uavParticles.data.buffer, uavParticles.data.byteOffset + iPart * partSize, partSize);
                verbose(iPart, VM.asNativeInner(partRaw, fx.particle));
            }
        });
    }


    reset();
    // emit(spawnRoutine());
    // dumpParticles();

    const { start, stop, isStopped } = timeline;

    function tick() {
        if (timeline.isStopped()) {
            return;
        }
        console.log(timeline.constants.elapsedTime, timeline.constants.elapsedTimeLevel);
        update();
        // emit(spawnRoutine());
        emit(1);
        // prerender()

        timeline.tick();
    }

    function asyncTest() {
        let counter = 0;
        const interval = setInterval(() => {
            if (counter === 0) {
                start();
            }
            verbose(`tick: ${counter}`);
            tick();
            if (counter === 5) {
                stop();
                dumpParticles();
                clearInterval(interval);
            }
            counter++;
        }, 1000);
    }

    function syncTest() {
        // debug setup
        // >>>
        start();
        tick();
        tick();
        tick();
        tick();
        stop();
        dumpParticles();
        // <<<
    }

    // asyncTest();
    // syncTest();

    return {
        start,
        stop,
        tick,
        isStopped,

        reset,
        dumpParticles
    };
}


export default Pipeline;
export type IPipeline = ReturnType<typeof Pipeline>;