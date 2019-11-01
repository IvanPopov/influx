import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGrammarFileSpecified, ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import fxRuntime from '@sandbox/logic/fxRuntime';
import parsing from '@sandbox/logic/parsing';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic, createLogicMiddleware } from 'redux-logic';
import { LOCATION_CHANGE, LocationChangeAction, push } from 'connected-react-router';
import { DEFAULT_FILENAME, getSourceCode } from '@sandbox/reducers/sourceFile';
import { history } from '@sandbox/reducers/router';
import { matchPath } from 'react-router';
import { sourceCode as sourceActions } from '@sandbox/actions';


const readFile = fname => fetch(fname).then(resp => resp.text());

const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        try {
            const content = await readFile(action.payload.filename);
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
            const content = await readFile(action.payload.filename);
            dispatch({ type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } });
        } catch (error) {
            // todo: add event;
        } finally {
            done();
        }
    }
});

export const LOCATION_NOT_FOUND = '/NotFound';

const navigationLogic = createLogic<IStoreState, LocationChangeAction['payload']>({
    type: LOCATION_CHANGE,
    async process({ getState, action }, dispatch, done) {
        const location = action.payload.location.pathname;
        const sourceFile = getSourceCode(getState());

        if (location === '/') {
            // dispatch(push(`/playground/${DEFAULT_FILENAME}/`));
            history.push(`/playground/${DEFAULT_FILENAME}/`);
            return done();
        }

        let match = matchPath<{ view: string; fx: string; name: string }>(location, {
            path: '/:view/:fx/:name?/:pass?/:property?',
            exact: false
        });

        if (match) {
            const { view, fx, name } = match.params;

            const supportedViews = ['playground', 'bytecode', 'program', 'ast'];
            if (supportedViews.indexOf(view) != -1) {
                if (!fx) {
                    // dispatch(push(`/${view}/${DEFAULT_FILENAME}/`));
                    history.push(`/${view}/${DEFAULT_FILENAME}/`);
                    return done();
                }

                if (fx === DEFAULT_FILENAME) {
                    return done();
                }

                const fxRequest = `./assets/fx/tests/${fx}`;
                if (sourceFile.filename !== fxRequest) {
                    dispatch(sourceActions.openFile(fxRequest));
                }
            }
            
            return done();
        }

        if (location !== LOCATION_NOT_FOUND) {
            history.push(LOCATION_NOT_FOUND);
        }
        done();
    }
});

const sourceFileNotFoundLogic = createLogic<IStoreState, LocationChangeAction['payload']>({
    type: evt.SOURCE_FILE_LOADING_FAILED,
    async process({ getState, action }, dispatch, done) {
        history.push(LOCATION_NOT_FOUND);
    }
});


export default createLogicMiddleware([
    fetchSourceFileLogic,
    fetchGrammarFileLogic,
    navigationLogic,
    sourceFileNotFoundLogic,
    ...parsing,
    ...fxRuntime
]);
