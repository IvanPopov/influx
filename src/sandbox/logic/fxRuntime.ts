// tslint:disable:no-for-in
// tslint:disable:forin

import { verbose } from '@lib/common';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';
import Pipeline from '@sandbox/containers/playground/Pipeline';
import { filterPartFx, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import { isNull } from 'util';

const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [ evt.SOURCE_CODE_ANALYSIS_COMPLETE, evt.PLAYGROUND_SELECT_EFFECT ],

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());

        if (!file.analysis) {
            done();
            return;
        }

        verbose('playground has been updated.');

        const scope = getScope(file);
        const list: IPartFxInstruction[] = filterPartFx(scope);

        let active = action.type === evt.PLAYGROUND_SELECT_EFFECT ? action.payload.name : null;
        let pipelinePrev = file.pipeline;
        let pipelineNext = null;

        if (!isNull(pipelinePrev) && isNull(active)) {
            if (list.map(fx => fx.name)
                .indexOf(pipelinePrev.name()) !== -1) {
                active = pipelinePrev.name();
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

            if (!pipelinePrev || !pipelinePrev.shadowReload(list[i])) {
                pipelineNext = Pipeline(list[i]);
                verbose('next pipeline has been created.');
            }
        }

        if (pipelineNext && pipelinePrev) {
            pipelinePrev.stop();
            pipelinePrev = null;
            verbose('previous pipeline has been dropped.');
        }

        const pipeline = pipelineNext || pipelinePrev;
        dispatch({ type: evt.PLAYGROUND_PIPELINE_UPDATE, payload: { pipeline } });
        done();
    }
});


export default [
    playgroundUpdateLogic
];
