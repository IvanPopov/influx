// tslint:disable:no-for-in
// tslint:disable:forin

import { isNull, verbose } from '@lib/common';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import * as Pipeline from '@sandbox/containers/playground/Pipeline';
import * as PipelineNEXT from '@sandbox/containers/playground/PipelineNEXT';
import { filterPartFx, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [ evt.SOURCE_CODE_ANALYSIS_COMPLETE, evt.PLAYGROUND_SELECT_EFFECT ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());

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
        let emitterPrev = file.emitter;
        let emitterNext = null;

        if (!isNull(emitterPrev) && isNull(active)) {
            if (list.map(fx => fx.name)
                .indexOf(emitterPrev.name) !== -1) {
                active = emitterPrev.name;
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

        if (active) {
            const i = list.map(fx => fx.name)
                .indexOf(active);

            if (!emitterPrev || !(await emitterPrev.shadowReload(list[i]))) {
                emitterNext = await PipelineNEXT.createEmitter(list[i]);
                // emitterNext = await Pipeline.createEmitter(list[i]);
                if (emitterNext) {
                    emitterNext.start();
                    verbose('next emitter has been created.');
                }
            }
        }

        if (emitterNext && emitterPrev) {
            emitterPrev.stop();
            emitterPrev = null;
            verbose('previous emitter has been dropped.');
        }

        const emitter = emitterNext || emitterPrev;
        dispatch({ type: evt.PLAYGROUND_EMITER_UPDATE, payload: { emitter } });
        done();
    }
});


export default [
    playgroundUpdateLogic
];
