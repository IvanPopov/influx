import { sourceCode as sourceActions } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import fxRuntime from '@sandbox/logic/fxRuntime';
import parsing from '@sandbox/logic/parsing';
import graph from '@sandbox/logic/graph';
import { history } from '@sandbox/reducers/router';
import { getFileState } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { LOCATION_CHANGE, LocationChangeAction } from 'connected-react-router';
import { matchPath } from 'react-router';
import { createLogic, createLogicMiddleware } from 'redux-logic';

const readFile = fname => fetch(fname);

const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        
        //
        // FIXME!!
        // hack to skip content loading if grapg is open
        //

        const location = getState().router.location.pathname;
        if (location == '/') return done();
        const match = matchPath<PATH_PARAMS_TYPE>(location, { path: LOCATION_PATTERN, exact: false });
        if (match) {
            const { view, fx, name } = match.params;
            if (name == GRAPH_KEYWORD)
            {
                return done();
            }
        }

        //
        // end-of-hack
        //
        
        try {
            const response = await readFile(action.payload.filename);
            if (response.status !== 200) {
                console.warn(`Could not find file ${action.payload.filename}.`);
                dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
                dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { } });
            } else {
                const content = await response.text();
                dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
                dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
            }
        } catch (error) {
            console.warn(`Could not find file ${action.payload.filename}.`);
            dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
            dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
        } finally {
            done();
        }
    }
});



export const LOCATION_NOT_FOUND = '/NotFound';
export const LOCATION_PATTERN = '/:view/:fx?/:name?/:pass?/:property?';
export const DEFAULT_FILENAME = '@new';

export const PLAYGROUND_VIEW = 'playground';
export const BYTECODE_VIEW = 'bytecode';
export const PROGRAM_VIEW = 'program';
export const AST_VIEW = 'ast';
export const PREPROCESSOR_VIEW = 'preprocessor';
export const GRAPH_VIEW = 'graph';

export const RAW_KEYWORD = '@preprocessed';
export const CODE_KEYWORD = '@formatted';
export const GRAPH_KEYWORD = '@graph';

export const ASSETS_PATH = './assets/fx/tests';

export const SUPPORTED_VIEWS = [ PLAYGROUND_VIEW, BYTECODE_VIEW, PROGRAM_VIEW, AST_VIEW, PREPROCESSOR_VIEW, GRAPH_VIEW ];

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
            // history.push(`/${PLAYGROUND_VIEW}/${DEFAULT_FILENAME}`);
            history.push(`/${PLAYGROUND_VIEW}/${DEFAULT_FILENAME}/${GRAPH_KEYWORD}`);
            //                                                  ^^^^^^^^^^^^^^^^^^^^^
            //                                         FIXME: hack to show graph view by default 
            //                                         -----------------------------------------
            return done();
        }

        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { view, fx, name } = match.params;

            const supportedViews = SUPPORTED_VIEWS;
            if (supportedViews.indexOf(view) !== -1) {
                if (!fx) {
                    // dispatch(push(`/${view}/${DEFAULT_FILENAME}/`));
                    history.push(`/${view}/${DEFAULT_FILENAME}`);
                    return done();
                }

                const fxRequest = `${ASSETS_PATH}/${fx}`;

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
            // if (fx !== DEFAULT_FILENAME) {
            if (!fx) {
                history.push(`/${view}/${DEFAULT_FILENAME}`);
            } else {
                history.push(LOCATION_NOT_FOUND);
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
    ...fxRuntime,
    ...graph
]);
