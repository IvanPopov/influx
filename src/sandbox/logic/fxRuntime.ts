// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundEffectSaveRequest, IPlaygroundSelectEffect, IPlaygroundSetOptionAutosave } from '@sandbox/actions/ActionTypes';
import * as Emitter from '@lib/fx/emitter';
import { IEmitter } from '@lib/idl/emitter';
import { filterPartFx, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as Path from '@lib/path/path';
import * as URI from '@lib/uri/uri';
import * as ipc from '@sandbox/ipc';

import { toast } from 'react-semantic-toasts';
import 'react-semantic-toasts/styles/react-semantic-alert.css';

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
        evt.PLAYGROUND_SWITCH_EMITTER_RUNTIME
    ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());
        const playground = getPlaygroundState(getState());
        const timeline = playground.timeline;

        const scope = getScope(file);
        const list: IPartFxInstruction[] = filterPartFx(scope);

        let active = action.type === evt.PLAYGROUND_SELECT_EFFECT ? action.payload.name : null;
        let emitter = playground.emitter;

        if (!isNull(emitter) && isNull(active)) {
            if (list.map(fx => fx.name).indexOf(emitter.getName()) !== -1) {
                active = emitter.getName();
            }
        }

        if (!active) {
            for (const fx of list) {
                if (fx.isValid()) {
                    active = fx.name;
                    break;
                }
            }
        }

        async function destroy(emitter: IEmitter) {
            if (emitter) {
                Emitter.destroy(emitter);
                verbose('previous emitter has been dropped.');
            }
        }

        async function create(forceRestart = true) {
            const i = list.map(fx => fx.name).indexOf(active);
            if (i == -1) {
                return null;
            }
            const emitter = Emitter.create(await FxBundle.createPartFxBundle(list[i]));
            if (emitter) {
                if (forceRestart) timeline.start();
                verbose('next emitter has been created.');
            }
            return emitter;
        }

        async function drop() {
            await destroy(emitter);
            emitter = null;
        }

        async function forceReload() {
            await destroy(emitter);
            emitter = await create();
        }

        async function switchVMRuntime() {
            await destroy(emitter);
            VM.switchRuntime();
            emitter = await create();
        }

        async function switchEmitterRuntime() {
            await destroy(emitter);
            Emitter.switchRuntime();
            emitter = await create();
        }

        async function softReload() {
            if (!emitter) {
                await forceReload();
                return;
            }

            let next = await create(false);
            let prev = emitter;

            Emitter.copy(next, prev);
            await destroy(prev);
            emitter = next;
        }

        switch (action.type) {
            case evt.PLAYGROUND_SWITCH_VM_RUNTIME:
                await switchVMRuntime();
                break;
            case evt.PLAYGROUND_SWITCH_EMITTER_RUNTIME:
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

        dispatch({ type: evt.PLAYGROUND_EMITTER_UPDATE, payload: { emitter } });

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
        const list = filterPartFx(scope);

        const emitter = playground.emitter;

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
        let data = await FxBundle.createPartFxBundle(list.find((fx => fx.name == emitter.getName())), options) as Uint8Array;

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
                filename = ipc.sync.saveFileDialog(URI.toLocalPath(playground.exportName), data);
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
        if (playground.exportName && playground.emitter) {
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
