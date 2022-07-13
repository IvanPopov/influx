// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundEffectSaveRequest, IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import * as Emitter from '@lib/fx/emitter';
import { IEmitter } from '@lib/idl/emitter';
import { filterPartFx, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as Path from '@lib/path/path';

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

        if (!file.slDocument) {
            done();
            return;
        }

        if (file.slDocument.diagnosticReport.errors > 0) {
            done();
            return;
        }

        verbose('playground has been updated.');

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

        async function create() {
            const i = list.map(fx => fx.name).indexOf(active);
            if (i == -1) {
                return null;
            }
            const emitter = Emitter.create(await FxBundle.createPartFxBundle(list[i]));
            if (emitter) {
                timeline.start();
                verbose('next emitter has been created.');
            }
            return emitter;
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

            let next = await create();
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
                await softReload();
        }

        dispatch({ type: evt.PLAYGROUND_EMITTER_UPDATE, payload: { emitter } });
        
        if (playground.autosave)
        {
            dispatch({ type: evt.PLAYGROUND_EFFECT_AUTOSAVE_REQUEST, payload: { } });
        }

        done();
    }
});


import isElectron from 'is-electron';
import { matchPath } from 'react-router-dom';
import { LOCATION_PATTERN, PATH_PARAMS_TYPE } from '.';
const ipcRenderer = isElectron() ? require('electron').ipcRenderer : null;


const playgroundSaveFileAsLogic = createLogic<IStoreState, IPlaygroundEffectSaveRequest['payload']>({
    type: [
        evt.PLAYGROUND_EFFECT_SAVE_REQUEST
    ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());
        const playground = getPlaygroundState(getState());
        const scope = getScope(file);
        const list = filterPartFx(scope);

        const emitter = playground.emitter;

        const exportName = Path.parse(file.uri);
        exportName.ext = "bfx"; // binary fx

        // download packed version of single (! active only !) emitter
        // -----------------------------------

        let data = await FxBundle.createPartFxBundle(list.find((fx => fx.name == emitter.getName())), true) as Uint8Array;

        // download unpacked version
        // -----------------------------------

        // const bundles = new BundleCollectionT(await Promise.all(list.map(async fx => await FxBundle.createPartFxBundle(fx))));
        // let fbb = new flatbuffers.Builder(1);
        // let size = bundles.pack(fbb);

        // electron
        if (ipcRenderer)
        {
            let filename = null;
            // reqest to make silent auto save using known local file path
            if (action.payload.silent)
            {
                filename = ipcRenderer.sendSync('process-save-file-silent', { name: playground.filename, data });
            } 
            else {
                filename = ipcRenderer.sendSync('process-save-file-dialog', { name: exportName.basename, data });
            }

            if (filename)
            {
                dispatch({ type: evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED, payload: { filename } });
                verbose(`Effect '${filename}' has been saved successfully.`);
                
                toast({
                    type: 'info',
                    title: `${action.payload.silent ? 'Autosave' : 'Save'} complete`,
                    description: `Effect '${filename}' has been saved successfully.`,
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
        if (playground.filename && playground.emitter)
        {
            dispatch({ type: evt.PLAYGROUND_EFFECT_SAVE_REQUEST, payload: { silent: true } });
        }
        done();
    }
});


export default [
    playgroundUpdateLogic,
    playgroundSaveFileAsLogic,
    playgroundEmitterUpdateLogic
];
