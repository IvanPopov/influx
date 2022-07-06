// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as VM from '@lib/fx/bytecode/VM';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import * as Emitter from '@lib/fx/emitter';
import { IEmitter } from '@lib/idl/emitter';
import { filterPartFx, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';


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

        async function destroy(emitter: IEmitter)
        {
            if (emitter) {
                Emitter.destroy(emitter);
                verbose('previous emitter has been dropped.');
            }
        }

        async function create()
        {
            const i = list.map(fx => fx.name).indexOf(active);
            if (i == -1)
            {
                return null;
            }
            const emitter = Emitter.create(await FxBundle.createPartFxBundle(list[i]));
            if (emitter) {
                timeline.start();
                verbose('next emitter has been created.');
            }
            return emitter;
        }

        async function forceReload()
        {
            await destroy(emitter);
            emitter = await create();
        }

        async function switchVMRuntime()
        {
            await destroy(emitter);
            VM.switchRuntime();
            emitter = await create();
        }

        async function switchEmitterRuntime()
        {
            await destroy(emitter);
            Emitter.switchRuntime();
            emitter = await create();
        }

        async function softReload()
        {
            if (!emitter)
            {
                await forceReload();
                return;
            }

            let next = await create();
            let prev = emitter;

            Emitter.copy(next, prev);
            await destroy(prev);
            emitter = next;
        }

        switch (action.type)
        {
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
        done();
    }
});


export default [
    playgroundUpdateLogic
];
