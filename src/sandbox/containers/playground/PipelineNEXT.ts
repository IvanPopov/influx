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


function createUAVEx(document: ISLDocument, reflection: IUavReflection, length: number) {
    const elementSize = document.root.scope.findType(reflection.elementType).size; // in bytes
    return VM.createUAV(reflection.name, elementSize, length, reflection.register);
}

function createUAVsEx(document: ISLDocument, reflection: ICSShaderReflection, capacity: number) {
    return reflection.uavs.map(uavReflection => createUAVEx(document, uavReflection, capacity));
}

function createBundle(document: ISLDocument, reflection: ICSShaderReflection): VM.Bundle {
    const shader = document.root.scope.findFunction(reflection.name, null);
    assert(shader);

    const program = Bytecode.translate(shader);
    return VM.load(program.code);
}

function setupResetBundle(document: ISLDocument, reflection: ICSShaderReflection, capacity: number) {
    const bundle = createBundle(document, reflection);
    const uavs = createUAVsEx(document, reflection, capacity);
    uavs.forEach(uav => { bundle.input[uav.index] = uav.buffer; });

    function run() {
        VM.dispatch(bundle, [capacity, 1, 1]);
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


    const resetBundle = setupResetBundle(slDocument, reflection.CSParticlesResetRoutine, capacity);
    const uavDeadIndices = resetBundle.uavs.find(uav => uav.name === 'uavDeadIndices');

    function reset() {
        resetBundle.run();
        uavDeadIndices.overwriteCounter(0);
    }

    reset();
    console.log(uavDeadIndices.data);

    // VM.play(bundle)

    return {
        reset
    };
}


export default Pipeline;
export type IPipeline = ReturnType<typeof Pipeline>;