// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import * as PipelineNEXT2 from '@sandbox/containers/playground/PipelineNEXT2';
import { filterPartFx, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';

const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [ evt.SOURCE_CODE_ANALYSIS_COMPLETE, evt.PLAYGROUND_SELECT_EFFECT, evt.PLAYGROUND_SWITCH_RUNTIME ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());
        const playground = getPlaygroundState(getState());

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
            if (list.map(fx => fx.name).indexOf(emitter.name) !== -1) {
                active = emitter.name;
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
            emitter = await PipelineNEXT2.createEmitterFromBundle(await FxBundle.createPartFxBundle(list[i]));
            if (emitter) {
                emitter.start();
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
            if (active) {
                if (emitter && (await emitter.shadowReload(await FxBundle.createPartFxBundle(list[i])))) {
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
        
        dispatch({ type: evt.PLAYGROUND_EMITER_UPDATE, payload: { emitter } });
        done();
    }
});


export default [
    playgroundUpdateLogic
];
