import { sourceCode as sourceActions } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import fxRuntime from '@sandbox/logic/fxRuntime';
import parsing from '@sandbox/logic/parsing';
import { history } from '@sandbox/reducers/router';
import { getFileState } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { LOCATION_CHANGE, LocationChangeAction } from 'connected-react-router';
import { matchPath } from 'react-router';
import { createLogic, createLogicMiddleware } from 'redux-logic';

const readFile = fname => fetch(fname).then(resp => resp.text());

const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        try {
            const content = await readFile(action.payload.filename);
            dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
            dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
        } catch (error) {
            console.warn(`Could not find file ${action.payload.filename}.`);
            dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
            dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
            // dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
        } finally {
            done();
        }
    }
});



export const LOCATION_NOT_FOUND = '/NotFound';
export const LOCATION_PATTERN = '/:view/:fx?/:name?/:pass?/:property?';
export const DEFAULT_FILENAME = '@new';
export type PATH_PARAMS_TYPE = { view: string; fx?: string; name?: string; pass?: string; property?: string };


const navigationLogic = createLogic<IStoreState, LocationChangeAction['payload']>({
    type: LOCATION_CHANGE,
    latest: true,
    debounce: 10,

    async process({ getState, action }, dispatch, done) {
        const location = action.payload.location.pathname;
        const sourceFile = getFileState(getState());

        if (location === '/') {
            // dispatch(push(`/playground/${DEFAULT_FILENAME}/`));
            history.push(`/playground/${DEFAULT_FILENAME}/`);
            return done();
        }

        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { view, fx, name } = match.params;

            const supportedViews = ['playground', 'bytecode', 'program', 'ast'];
            if (supportedViews.indexOf(view) !== -1) {
                if (!fx) {
                    // dispatch(push(`/${view}/${DEFAULT_FILENAME}/`));
                    history.push(`/${view}/${DEFAULT_FILENAME}`);
                    return done();
                }

                const fxRequest = `./assets/fx/tests/${fx}`;

                if (sourceFile.uri !== fxRequest) {
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


/**
 * Redirect to default source (@new) if requested file was not found.
 */
const sourceFileNotFoundLogic = createLogic<IStoreState>({
    type: evt.SOURCE_FILE_LOADING_FAILED,
    async process({ getState }, dispatch, done) {
        const location = getState().router.location.pathname;
        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { view, fx } = match.params;
            if (fx !== DEFAULT_FILENAME) {
                history.push(`/${view}/${DEFAULT_FILENAME}`);
            }
        }

        return done();
    }
});


export default createLogicMiddleware([
    fetchSourceFileLogic,
    navigationLogic,
    sourceFileNotFoundLogic,
    ...parsing,
    ...fxRuntime
]);
