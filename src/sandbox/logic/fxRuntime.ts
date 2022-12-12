// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import * as Techniques from '@lib/fx/techniques';
import { ITechnique } from '@lib/idl/ITechnique';
import * as Path from '@lib/path/path';
import * as URI from '@lib/uri/uri';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundEffectSaveRequest, IPlaygroundSelectEffect, IPlaygroundSetOptionAutosave } from '@sandbox/actions/ActionTypes';
import * as ipc from '@sandbox/ipc';
import * as Depot from '@sandbox/reducers/depot';
import { filterTechniques, getPlaygroundState } from '@sandbox/reducers/playground';
import { asConvolutionPack, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IPlaygroundControls } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

import { decodeBundleControls } from '@lib/fx/bundles/utils';
import { asFxTranslatorOprions } from '@sandbox/reducers/translatorParams';
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
        evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME
    ],

    async process({ getState, action }, dispatch, done) {
        const state = getState();
        const file = getFileState(state);
        const playground = getPlaygroundState(state);
        const timeline = playground.timeline;
        const depot = Depot.getDepot(state);
        const translator = asFxTranslatorOprions(state);

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
            for (const fx of list) {
                if (fx.isValid()) {
                    active = fx.name;
                    break;
                }
            }
        }

        async function destroy(technique: ITechnique) {
            Techniques.destroy(technique);
            // verbose('previous technique has been dropped.');
        }

        async function copy(next: ITechnique, prev: ITechnique) {
            Techniques.copy(next, prev);
        }

        async function create(forceRestart = true): Promise<[ ITechnique, IPlaygroundControls ]> {
            const i = list.map(fx => fx.name).indexOf(active);

            if (i == -1) {
                return [ null, null ];
            }

            const bundle = await FxBundle.createBundle(list[i], { translator, omitHLSL: true });
            const tech = Techniques.create(bundle);
            const controls = decodeBundleControls(bundle);

            if (tech) {
                if (forceRestart) timeline.start();
                // verbose('next technique has been created.');
            }

            return [ tech, controls ];
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

        async function switchTechniqueRuntime() {
            await destroy(technique);
            Techniques.switchRuntime();
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


            await copy(next, prev);
            await destroy(prev);
            
            technique = next;
            controls = ctrlsNext;
        }

        switch (action.type) {
            case evt.PLAYGROUND_SWITCH_VM_RUNTIME:
                await switchVMRuntime();
                break;
            case evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME:
                await switchTechniqueRuntime();
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
        const translator = asFxTranslatorOprions(state);

        const tech = playground.technique;

        const exportName = Path.parse(file.uri);
        exportName.ext = "bfx"; // binary fx

        // download packed version of single (! active only !) technique
        // -----------------------------------
        let options: FxBundle.BundleOptions = { 
            packed: true,
            meta: {
                source: file.uri,
                author: state.s3d?.p4?.['User name']
            },
            omitGLSL: false,
            omitHLSL: false,
            translator
        };
        
        const techInstr = list.find((fx => fx.name == tech.getName()));
        const data = await FxBundle.createBundle(techInstr, options, asConvolutionPack(state)) as Uint8Array;

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
            // download packed version of single (! active only !) technique
            // -----------------------------------
            downloadByteBuffer(data, exportName.basename, 'application/octet-stream');

            // download unpacked version
            // -----------------------------------
            // downloadByteBuffer(fbb.asUint8Array(), exportName.basename, 'application/octet-stream');   
        }

        done();
    }
});


// on technique update complete
const playgroundTechniqueUpdateLogic = createLogic<IStoreState>({
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

// on technique update complete
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
    playgroundTechniqueUpdateLogic,
    playgroundSetOptionAutosave
];
