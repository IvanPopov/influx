import IStoreState, { IParserParams } from '@sandbox/store/IStoreState';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { createLogic } from 'redux-logic';
import { getSourceCode } from '@sandbox/reducers/sourceFile';

const updateParseTreeLogic = createLogic<IStoreState>({
    type: evt.SOURCE_CODE_PARSE_TREE_CHANGED,

    async process({ getState }, dispatch, done) {
        let { parseTree } = getSourceCode(getState());
        console.log('source code parse tree changed!', parseTree);
        done();
    }
});


export default [updateParseTreeLogic];
