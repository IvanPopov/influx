import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGrammarFileSpecified, ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import fxRuntime from '@sandbox/logic/fxRuntime';
import parsing from '@sandbox/logic/parsing';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic, createLogicMiddleware } from 'redux-logic';


const readFile = fname => fetch(fname).then(resp => resp.text());

const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        try {
            let content = await readFile(action.payload.filename);
            dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
        } catch (error) {
            dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
            // dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
        } finally {
            done();
        }
    }
});



const fetchGrammarFileLogic = createLogic<IStoreState, IGrammarFileSpecified['payload']>({
    type: evt.GRAMMAR_FILE_SPECIFIED,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        try {
            let content = await readFile(action.payload.filename);
            dispatch({ type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } });
        } catch (error) {
            // todo: add event;
        } finally {
            done();
        }
    }
});


export default createLogicMiddleware([
    fetchSourceFileLogic,
    fetchGrammarFileLogic,
    ...parsing,
    ...fxRuntime
]);
