// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import { filterPartFx, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import { Bundle, BundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as flatbuffers from 'flatbuffers';
import { loadEmiterFromBundle } from '@sandbox/containers/playground/ts/emitter';
import { IUAV } from '@lib/idl/bytecode';
import { IEmitter } from '@sandbox/containers/playground/idl/IEmitter';

/////////////////////////////////////////////////////////////////////

function decodeBundleData(data: Uint8Array | BundleT): BundleT {
    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        let fx = new BundleT();
        let buf = new flatbuffers.ByteBuffer(data);
        Bundle.getRootAsBundle(buf).unpackTo(fx);

        // PipelineCpp.make(data);
        return fx;
    }

    return <BundleT>data;
}

let uavResources: IUAV[] = null;
let fx: BundleT = null;

function shadowReload(data: Uint8Array | BundleT): IEmitter {
    const fxNext = decodeBundleData(data);
    if (!FxBundle.comparePartFxBundles(fxNext.content, fx.content)) 
    {
        return null;
    }

    verbose('emitter reloaded from the shadow');
    return loadEmiterFromBundle(fxNext, uavResources);
}

function loadFromScratch(data: Uint8Array | BundleT): IEmitter
{
    uavResources = [];
    fx = decodeBundleData(data);
    const emitter = loadEmiterFromBundle(fx, uavResources);
    emitter.reset();
    return emitter;
}

/////////////////////////////////////////////////////////////////////

const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [ evt.SOURCE_CODE_ANALYSIS_COMPLETE, evt.PLAYGROUND_SELECT_EFFECT, evt.PLAYGROUND_SWITCH_RUNTIME ],

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

        async function destroy()
        {
            if (emitter) {
                emitter.destroy();
                emitter = null;
                verbose('previous emitter has been dropped.');
            }
        }

        async function create()
        {
            const i = list.map(fx => fx.name).indexOf(active);
            emitter = loadFromScratch(await FxBundle.createPartFxBundle(list[i]));
            if (emitter) {
                timeline.start();
                verbose('next emitter has been created.');
            }
        }

        async function forceReload()
        {
            await destroy();
            await create();
        }

        async function switchRuntime()
        {
            await destroy();
            VM.switchRuntime();
            await create();
        }

        async function softReload()
        {
            const i = list.map(fx => fx.name).indexOf(active);
            if (active && emitter) {
                const updateEmitter = shadowReload(await FxBundle.createPartFxBundle(list[i]));
                if (updateEmitter)
                {
                    emitter = updateEmitter;
                    // soft reload succeeded
                    return;
                }
            }
            
            await forceReload();
        }

        switch (action.type)
        {
            case evt.PLAYGROUND_SWITCH_RUNTIME:
                await switchRuntime();
                break;
            default:
                await softReload();
        }
        
        dispatch({ type: evt.PLAYGROUND_EMITTER_UPDATE, payload: { emitter } });
        done();
    }
});


export default [
    playgroundUpdateLogic
];
