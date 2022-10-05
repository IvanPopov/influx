// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import * as Emitter from '@lib/fx/emitter';
import { ITechnique } from '@lib/idl/ITechnique';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as Path from '@lib/path/path';
import * as URI from '@lib/uri/uri';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundEffectSaveRequest, IPlaygroundSelectEffect, IPlaygroundSetOptionAutosave } from '@sandbox/actions/ActionTypes';
import * as ipc from '@sandbox/ipc';
import { filterTechniques, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IPlaygroundControls } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

import { toast } from 'react-semantic-toasts';
import 'react-semantic-toasts/styles/react-semantic-alert.css';
import { decodeBundleControls } from '@lib/fx/bundles/utils';
import { IEmitter } from '@lib/idl/emitter';
import { EInstructionTypes, ETechniqueType, IPassInstruction } from '@lib/idl/IInstruction';

function downloadByteBuffer(data: Uint8Array, fileName: string, mimeType: 'application/octet-stream') {
    downloadBlob(new Blob([data], { type: mimeType }), fileName);
};

function downloadBlob(blob: Blob, fileName: string) {
    let url;
    url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

function downloadURL(data: string, fileName: string) {
    let a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
};


const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [
        evt.SOURCE_CODE_ANALYSIS_COMPLETE,
        evt.PLAYGROUND_SELECT_EFFECT,
        evt.PLAYGROUND_SWITCH_VM_RUNTIME,
        evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME
    ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());
        const playground = getPlaygroundState(getState());
        const timeline = playground.timeline;

        const scope = getScope(file);
        const list = filterTechniques(scope);

        let active = action.type === evt.PLAYGROUND_SELECT_EFFECT ? action.payload.name : null;
        let technique = playground.technique;
        let controls = playground.controls;

        if (!isNull(technique) && isNull(active)) {
            if (list.map(fx => fx.name).indexOf(technique.getName()) !== -1) {
                active = technique.getName();
            }
        }

        if (!active) {
            stop:
            for (const fx of list) {
                switch (fx.type) {
                    case ETechniqueType.k_PartFx:
                        if ((fx as IPartFxInstruction).isValid()) {
                            active = fx.name;
                            break stop;
                        }
                    // material
                    case ETechniqueType.k_BasicFx:
                        // todo: check if it is valid
                        active = fx.name;
                        break stop;
                }
                
            }
        }

        async function destroy(technique: ITechnique) {
            if (technique?.getType() === 'emitter') {
                Emitter.destroy(technique as IEmitter);
                verbose('previous emitter has been dropped.');
            }
        }

        async function copy(next: ITechnique, prev: ITechnique) {
            if (next?.getType() === 'emitter') {
                Emitter.copy(next as IEmitter, prev as IEmitter);
            }
        }

        async function create(forceRestart = true): Promise<[ ITechnique, IPlaygroundControls ]> {
            const i = list.map(fx => fx.name).indexOf(active);

            if (i == -1) {
                return null;
            }

            // fixme: remove dummy code
            if (list[i].instructionType === EInstructionTypes.k_TechniqueDecl) {
                return [ { getName() { return list[i].name }, getType() { return 'material' } }, null ];
            }

            const bundle = await FxBundle.createPartFxBundle(list[i] as IPartFxInstruction);
            const emitter = Emitter.create(bundle);
            const controls = decodeBundleControls(bundle);

            if (emitter) {
                if (forceRestart) timeline.start();
                verbose('next emitter has been created.');
            }

            return [ emitter, controls ];
        }

        async function drop() {
            await destroy(technique);
            [ technique, controls ] = [ null, null ];
        }

        async function forceReload() {
            await destroy(technique);
            [ technique, controls ] = await create();
        }

        async function switchVMRuntime() {
            await destroy(technique);
            VM.switchRuntime();
            [ technique, controls ] = await create();
        }

        async function switchEmitterRuntime() {
            await destroy(technique);
            Emitter.switchRuntime();
            [ technique, controls ] = await create();
        }

        async function softReload() {
            if (!technique) {
                await forceReload();
                return;
            }

            // controls stay unchanged
            let [ next, ctrlsNext ] = await create(false);
            let prev = technique;

            if (prev.getType() === next.getType()) {
                await copy(next, prev);
            }

            await destroy(prev);
            
            technique = next;
            controls = ctrlsNext;
        }

        switch (action.type) {
            case evt.PLAYGROUND_SWITCH_VM_RUNTIME:
                await switchVMRuntime();
                break;
            case evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME:
                await switchEmitterRuntime();
                break;
            default:
                if (!file.slDocument || file.slDocument.diagnosticReport.errors > 0) {
                    await drop();
                }
                else {
                    await softReload();
                }
        }

        dispatch({ type: evt.PLAYGROUND_TECHNIQUE_UPDATE, payload: { technique, controls } });

        if (playground.autosave) {
            dispatch({ type: evt.PLAYGROUND_EFFECT_AUTOSAVE_REQUEST, payload: {} });
        }

        // construct default export name if possible
        if (!playground.exportName) {
            const uri = URI.parse(file.uri);
            if (uri.protocol == 'file') {
                const filename = Path.parse(URI.toLocalPath(uri)).replaceExt('bfx');
                // dispatch fake event to update export name
                dispatch({ type: evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED, payload: { filename: URI.fromLocalPath(filename) } });
            }
        }

        done();
    }
});



const playgroundSaveFileAsLogic = createLogic<IStoreState, IPlaygroundEffectSaveRequest['payload']>({
    type: [
        evt.PLAYGROUND_EFFECT_SAVE_REQUEST
    ],

    async process({ getState, action }, dispatch, done) {
        const state = getState();
        const file = getFileState(state);
        const playground = getPlaygroundState(state);
        const scope = getScope(file);
        const list = filterTechniques(scope);

        const tech = playground.technique;

        const exportName = Path.parse(file.uri);
        exportName.ext = "bfx"; // binary fx

        // download packed version of single (! active only !) emitter
        // -----------------------------------
        let options: FxBundle.BundleOptions = { 
            packed: true,
            meta: {
                source: file.uri,
                author: state.s3d?.p4?.['User name']
            }
        };
        
        const techInstr = list.find((fx => fx.name == tech.getName()));
        console.assert(techInstr.type === ETechniqueType.k_PartFx);

        const data = await FxBundle.createPartFxBundle(techInstr as IPartFxInstruction, options) as Uint8Array;

        // download unpacked version
        // -----------------------------------

        // const bundles = new BundleCollectionT(await Promise.all(list.map(async fx => await FxBundle.createPartFxBundle(fx))));
        // let fbb = new flatbuffers.Builder(1);
        // let size = bundles.pack(fbb);

        if (ipc.isElectron()) {
            let filename = null;
            // reqest to make silent auto save using known local file path
            if (action.payload.silent) {
                filename = ipc.sync.saveFile(URI.toLocalPath(playground.exportName), data);
            }
            else {
                filename = ipc.sync.saveFileDialog(
                { 
                    defaultPath: URI.toLocalPath(playground.exportName),
                    title: "Save binary FX", 
                    buttonLabel: "Save",
                    filters: [
                        { name: 'Binary FX', extensions: ['bfx'] },
                    ]
                }
                , data);
            }

            if (filename) {
                // URI.fromLocalPath(fromLocalPath)
                dispatch({ type: evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED, payload: { filename: URI.fromLocalPath(filename) } });
                verbose(`Effect '${filename}' has been exported successfully.`);

                toast({
                    size: 'tiny',
                    type: 'info',
                    title: `${action.payload.silent ? 'Autoexport' : 'Export'} complete`,
                    description: `Effect '${filename}' has been exported successfully.`,
                    animation: 'bounce',
                    time: 2000
                });
            }
        }
        // web browser
        else {
            // download packed version of single (! active only !) emitter
            // -----------------------------------
            downloadByteBuffer(data, exportName.basename, 'application/octet-stream');

            // download unpacked version
            // -----------------------------------
            // downloadByteBuffer(fbb.asUint8Array(), exportName.basename, 'application/octet-stream');   
        }

        done();
    }
});


// on emitter update complete
const playgroundEmitterUpdateLogic = createLogic<IStoreState>({
    type: [
        evt.PLAYGROUND_EFFECT_AUTOSAVE_REQUEST
    ],
    latest: true,
    debounce: 1000,

    async process({ getState, action }, dispatch, done) {
        const playground = getPlaygroundState(getState());
        if (playground.exportName && playground.technique) {
            dispatch({ type: evt.PLAYGROUND_EFFECT_SAVE_REQUEST, payload: { silent: true } });
        }
        done();
    }
});

// on emitter update complete
const playgroundSetOptionAutosave = createLogic<IStoreState, IPlaygroundSetOptionAutosave['payload']>({
    type: [evt.PLAYGROUND_SET_OPTION_AUTOSAVE],
    latest: true,
    debounce: 100,

    async process({ getState, action }, dispatch, done) {
        if (action.payload.enabled) {
            dispatch({ type: evt.PLAYGROUND_EFFECT_AUTOSAVE_REQUEST, payload: {} });
        }
        done();
    }
});



export default [
    playgroundUpdateLogic,
    playgroundSaveFileAsLogic,
    playgroundEmitterUpdateLogic,
    playgroundSetOptionAutosave
];
