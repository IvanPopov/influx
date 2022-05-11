
import { createDefaultSLParser } from '@lib/fx/SLParser';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const resetLogic = createLogic<IStoreState>({
    type: [evt.GRAPH_RESET],

    async process({ getState, action }, dispatch, done) {
        // const parserParams = getState().parserParams;
        console.log('graph reset!');
        done();
    }
});

export default [
    resetLogic
];