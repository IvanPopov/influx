import * as evt from '@sandbox/actions/ActionTypeKeys';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const analysisCompleteLogic = createLogic<IStoreState>({
    type: evt.SOURCE_CODE_ANALYSIS_COMPLETE,

    async process({ getState }, dispatch, done) {
        // setTimeout(() =>
        // // let { parseTree } = getSourceCode(getState());
        // done(), 5000);
        done();
    }
});


export default [
    analysisCompleteLogic
];
