import * as path from '@lib/path/path';
import { sourceCode as sourceActions } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import * as Depot from '@sandbox/reducers/depot';
import { history } from '@sandbox/reducers/router';
import IStoreState from '@sandbox/store/IStoreState';
import { LocationChangeAction, LOCATION_CHANGE } from 'connected-react-router';
import { matchPath } from 'react-router';
import { toast } from 'react-semantic-toasts';
import 'react-semantic-toasts/styles/react-semantic-alert.css';
import { createLogic } from 'redux-logic';
import * as URI from '@lib/uri/uri';

// hack to resolve unexisting files
const fetchVirtual = (fname) =>
{
    if (fname === URI.fromLocalPath(DEFAULT_FILENAME))
        return { status: 200, async text() { return `/* created: ${new Date()} */\n\n`; } }
    return null;
}

const readFile = fname => {
    return fetchVirtual(fname) || fetch(fname);
}

const fetchSourceFileLogic = createLogic<IStoreState, ISourceFileRequest['payload']>({
    type: evt.SOURCE_FILE_REQUEST,
    latest: true,
    async process({ getState, action }, dispatch, done) {
        // drop autosave params
        dispatch({ type: evt.PLAYGROUND_EFFECT_HAS_BEEN_DROPPED, payload: { } });

        try {
            const response = await readFile(action.payload.filename);
            if (response.status !== 200) {
                console.warn(`Could not find file ${action.payload.filename}.`);
                dispatch({ type: evt.SOURCE_FILE_DROP_STATE });
                dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { } });
            } else {
                const ext = path.ext(action.payload.filename);
                const content = await response.text();
                dispatch({ type: evt.SOURCE_FILE_DROP_STATE });

                if (ext === 'xfx')    
                {
                    dispatch({ type: evt.GRAPH_LOADED, payload: { content } });
                }
                else {
                    dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
                }
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
export const DEFAULT_FILENAME = 'unnamed';

export const PLAYGROUND_VIEW = 'playground';
export const BYTECODE_VIEW = 'bytecode';
export const PROGRAM_VIEW = 'program';
export const AST_VIEW = 'ast';
export const PREPROCESSOR_VIEW = 'preprocessor';
export const GRAPH_VIEW = 'graph';

export const RAW_KEYWORD = '@preprocessed';
export const CODE_KEYWORD = '@formatted';
export const GRAPH_KEYWORD = '@graph';

export const LOCAL_SESSION_ID = 'last-session-id';
export const LOCAL_SESSION_AUTOSAVE = 'local-session-autosave';


export const SUPPORTED_VIEWS = [ PLAYGROUND_VIEW, BYTECODE_VIEW, PROGRAM_VIEW, AST_VIEW, PREPROCESSOR_VIEW, GRAPH_VIEW ];

export type PATH_PARAMS_TYPE = { view: string; fx?: string; name?: string; pass?: string; property?: string };

const navigationLogic = createLogic<IStoreState, LocationChangeAction['payload']>({
    type: LOCATION_CHANGE,
    latest: true,
    debounce: 10,

    async process({ getState, action }, dispatch, done) {
        const location = action.payload.location.pathname;
        const { sourceFile, depot } = getState()
        const defaultFilename = localStorage.getItem(LOCAL_SESSION_ID) || DEFAULT_FILENAME;
        
        if (location === '/') {
            if (defaultFilename !== DEFAULT_FILENAME)
                setTimeout(() => {
                    toast({
                        type: 'warning',
                        title: `Last session`,
                        description: `Last session has been loaded.`,
                        animation: 'fade up',
                        time: 2000
                    });
                }, 2000);
                
            history.push(`/${PLAYGROUND_VIEW}/${defaultFilename}`);
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
                    history.push(`/${view}/${DEFAULT_FILENAME}`);
                    return done();
                }
                
                const fxRequest = Depot.resolveName(depot, fx);
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
 * Redirect to default source (DEFAULT_FILENAME) if requested file was not found.
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
            if (!fx) {
                // something went wrong
                history.push(`/${view}/${DEFAULT_FILENAME}`);
            } else {
                // show special page if request fx is not found
                history.push(LOCATION_NOT_FOUND);
            }
        }

        return done();
    }
});

export default [
    fetchSourceFileLogic,
    navigationLogic,
    sourceFileNotFoundLogic
];
