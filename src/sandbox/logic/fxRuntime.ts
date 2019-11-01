// tslint:disable:no-for-in
// tslint:disable:forin

import * as evt from '@sandbox/actions/ActionTypeKeys';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import { assert } from '@lib/common';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import { ETechniqueType } from '@lib/idl/IInstruction';
import Pipeline from '@sandbox/containers/playground/Pipeline';
import { isNull } from 'util';
import { IPlaygroundSelectEffect } from '@sandbox/actions/ActionTypes';

const playgroundUpdateLogic = createLogic<IStoreState, IPlaygroundSelectEffect['payload']>({
    type: [ evt.SOURCE_CODE_ANALYSIS_COMPLETE, evt.PLAYGROUND_SELECT_EFFECT ],

    async process({ getState, action }, dispatch, done) {
        // setTimeout(() =>
        // // let { parseTree } = getSourceCode(getState());
        // done(), 5000);

        const sourceCode = getSourceCode(getState());

        if (!sourceCode.analysis) {
            done();
            return;
        }

        // console.log('playground has been updated (scope has beed changed).');

        const scope = sourceCode.analysis.scope;
        assert(scope);

        const list: IPartFxInstruction[] = [];

        for (const name in scope.techniqueMap) {
            const tech = scope.techniqueMap[name];
            if (tech.type !== ETechniqueType.k_PartFx) {
                continue;
            }
            list.push(<IPartFxInstruction>tech);
        }

        let active = action.type === evt.PLAYGROUND_SELECT_EFFECT ? action.payload.name : null;
        let pipelinePrev = <ReturnType<typeof Pipeline>>sourceCode.pipeline;
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
                // console.log('next pipeline has been created.');
            }
        }

        if (pipelineNext && pipelinePrev) {
            pipelinePrev.stop();
            pipelinePrev = null;
            // console.log('previous pipeline has been dropped.');
        }

        const pipeline = pipelineNext || pipelinePrev;
        dispatch({ type: evt.PLAYGROUND_PIPELINE_UPDATE, payload: { pipeline } });
        done();
    }
});


export default [
    playgroundUpdateLogic
];
