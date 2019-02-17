import * as fs from 'fs';
import { createLogic, createLogicMiddleware } from 'redux-logic';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import IStoreState from '@sandbox/store/IStoreState';
import parsing from './parsing'


const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    process({ getState, action }, dispatch, done) {
        fs.readFile(action.payload.filename, 'utf8', (error: Error, content: string) => {
            if (error) {
                dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
            } else {
                dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
            }
            done();
        });
    }
});


export default createLogicMiddleware([
    fetchSourceFileLogic,
    ...parsing
]);