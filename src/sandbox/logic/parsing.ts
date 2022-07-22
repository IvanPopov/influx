/* tslint:disable:typedef */

import { isNull, verbose } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import * as VM from '@lib/fx/bytecode/VM';
import { createFXSLDocument } from '@lib/fx/FXSLDocument';
import { createSLASTDocument } from '@lib/fx/SLASTDocument';
import { createDefaultSLParser } from '@lib/fx/SLParser';
import { createTextDocument } from '@lib/fx/TextDocument';
import { createPPDocument } from '@lib/parser/Preprocessor';
import { IDispatch } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerCompile, IDebuggerOptionsChanged, IMarkerDesc } from '@sandbox/actions/ActionTypes';
import { getDebugger, getFileState } from '@sandbox/reducers/sourceFile';
import IStoreState, { IDebuggerState, IFileState, IMarker } from '@sandbox/store/IStoreState';
import { LocationChangeAction, LOCATION_CHANGE } from 'connected-react-router';
import { matchPath } from 'react-router-dom';
import { toast } from 'react-semantic-toasts';
import 'react-semantic-toasts/styles/react-semantic-alert.css';
import { createLogic } from 'redux-logic';
import { LOCAL_SESSION_ID, LOCATION_PATTERN, PATH_PARAMS_TYPE, RAW_KEYWORD } from './common';
import * as Depot from '@sandbox/reducers/depot';


const DEBUGGER_COLORIZATION_PREFIX = 'debug-ln-clr';

declare const PRODUCTION: boolean;

function cleanupMarkersBatch(state: IStoreState, prefix: string): string[] {
    return Object
        .keys(state.sourceFile.markers)
        .filter(name => name.startsWith(`${prefix}-`));
}

function cleanupMarkers(dispatch: IDispatch, batch: string[]) {
    if (batch.length > 0) {
        dispatch({ type: evt.SOURCE_CODE_REMOVE_MARKER_BATCH, payload: { batch } });
    }
}

type IMarkerType = IMarker['type'];

function emitMarkersBatch(list, type: IMarkerType, prefix: string): IMarkerDesc[] {
    return list.map((desc, i) => {
        const { loc, message, payload } = desc;
        return {
            name: `${prefix}-${message}-${i}`,
            range: loc,
            type,
            tooltip: message,
            payload
        };
    });
}

function emitMarkers(dispatch: IDispatch, batch: IMarkerDesc[]) {
    dispatch({ type: evt.SOURCE_CODE_ADD_MARKER_BATCH, payload: { batch } });
}


const emitDebuggerColorization = (list) => emitMarkersBatch(list, 'line', DEBUGGER_COLORIZATION_PREFIX);
const cleanupDebuggerColorization = (state) => cleanupMarkersBatch(state, DEBUGGER_COLORIZATION_PREFIX);


async function processParsing(state: IStoreState, dispatch): Promise<void> {
    const { depot, parserParams: { parsingFlags: flags }, sourceFile: { content: source, uri } } = state;

    // if (matchLocation(state).params.view !== PLAYGROUND_VIEW) {
    //     return;
    // }

    if (!source) {
        return;
    }
    const includeResolver = Depot.makeResolver(depot);
    const textDocument = await createTextDocument(uri, source);
    const slastDocument = await createSLASTDocument(textDocument, { flags, includeResolver });

    const unreachableCode = slastDocument.unreachableCode.filter(loc => String(loc.start.file) === String(slastDocument.uri));

    // TODO: move it to language service
    cleanupMarkers(<IDispatch>dispatch, cleanupMarkersBatch(state, 'unreachable-code'));
    emitMarkers(<IDispatch>dispatch, emitMarkersBatch(unreachableCode.map(loc => ({ loc, payload: {} })), 'unreachable-code', 'unreachable-code'));

    if (!PRODUCTION) {
        // verbose(Diagnostics.stringify(diag));
    }

    // if (!diag.errors)
    {
        dispatch({ type: evt.SOURCE_CODE_PARSING_COMPLETE, payload: { slastDocument } });
    }
}


async function processAnalyze(state: IStoreState, dispatch: IDispatch): Promise<void> {
    const { slastDocument } = state.sourceFile;

    if (!slastDocument) {
        return;
    }

    const slDocument = await createFXSLDocument(slastDocument);

    if (!PRODUCTION) {
        // verbose(Diagnostics.stringify(diag));
    }

    // if (!diag.errors)
    {
        dispatch({ type: evt.SOURCE_CODE_ANALYSIS_COMPLETE, payload: { result: slDocument } });
    }
}


const updateParserLogic = createLogic<IStoreState>({
    type: [evt.GRAMMAR_CONTENT_SPECIFIED, evt.PARSER_PARAMS_CHANGED],

    async process({ getState, action }, dispatch, done) {
        const parserParams = getState().parserParams;
        const { grammar, type, flags } = parserParams;
        /**
         * !!! note: all inline functionality inside analyze.ts depends on this setup
         */
        console.log('%c Creating parser...', 'background: #222; color: #bada55');
        try {
            createDefaultSLParser({ grammar, type, flags });
            console.log('%c [ DONE ]', 'background: #222; color: #bada55');
        } catch (e) {
            console.error('could not initialize parser.');
            return null;
        }

        // todo: add support for failed setup
        done();
    }
});


const updateSourceContentLogic = createLogic<IStoreState>({
    type: [evt.SOURCE_CODE_MODIFED, evt.SOURCE_FILE_LOADED],
    latest: true,
    debounce: 500,

    async process({ getState, action, action$ }, dispatch, done) {
        const $debugger = getDebugger(getState());
        if (!$debugger.options.autocompile) {
            dispatch({ type: evt.DEBUGGER_RESET });
        }
        await processParsing(getState(), dispatch);

        // TODO: move to separate routine

        const location = getState().router.location.pathname;
        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { view, fx, name } = match.params;
            if (fx && name === RAW_KEYWORD) {
                await processRaw(getState(), dispatch);
            }

            // Is new file loaded?
            if (action.type === evt.SOURCE_FILE_LOADED) {
                if (localStorage.getItem(LOCAL_SESSION_ID) !== fx) {
                    localStorage.setItem(LOCAL_SESSION_ID, fx);
                    verbose(`Last sesstion data has been updated. (${localStorage.getItem(LOCAL_SESSION_ID)})`);

                    toast({
                        type: 'info',
                        title: 'Session update.',
                        description: `Last sesstion data has been updated.`,
                        animation: 'fade up',
                        size: 'tiny',
                        time: 2000
                    });
                }
            }

        }

        done();
    }
});



const parsingCompleteLogic = createLogic<IStoreState>({
    type: [evt.SOURCE_CODE_PARSING_COMPLETE],
    async process({ getState, action, action$ }, dispatch, done) {
        await processAnalyze(getState(), <any>dispatch);
        done();
    }
});


function buildDebuggerSourceColorization(debuggerState: IDebuggerState, fileState: IFileState) {
    // const fn = fileState.slDocument.root.scope.findFunction(debuggerState.expression, null);
    const locList = [];

    if (debuggerState.runtime) {
        // const from = fn.sourceNode.loc.start.line;
        // const to = fn.sourceNode.loc.end.line;

        const from = 0;
        const to = fileState.content.split('\n').length;

        const cdl = cdlview(debuggerState.runtime.cdl);

        for (let ln = from; ln <= to; ++ln) {
            const color = cdl.resolveLineColor(ln, fileState.uri);
            if (color !== -1) {
                const loc = { start: { file: null, line: ln, column: 0 }, end: null };
                locList.push({ loc, payload: { color } });
            }
        }
    }
    return locList;
}


const debuggerCompileLogic = createLogic<IStoreState, IDebuggerCompile['payload']>({
    type: evt.DEBUGGER_COMPILE,
    cancelType: evt.DEBUGGER_RESET,
    latest: true,

    async process({ getState, action }, dispatch, done) {
        const file = getFileState(getState());
        const debuggerState = getDebugger(getState());
        const expression = (action.payload && action.payload.expression) || debuggerState.expression || `${Bytecode.DEFAULT_ENTRY_POINT_NAME}()`;


        if (!isNull(file.slDocument)) {
            const func = file.slDocument.root.scope.findFunction(expression, null);
            // workaround for debug purposes (interpretations of the expressions string as function name)
            if (func) {
                const program = Bytecode.translate(func);
                dispatch({ type: evt.DEBUGGER_START_DEBUG, payload: { expression, runtime: program } });
            } else {
                const program = await Bytecode.translateExpression(expression, file.slDocument);
                if (!isNull(program)) {
                    dispatch({ type: evt.DEBUGGER_START_DEBUG, payload: { expression, runtime: program } });
                } else {
                    alert('could not evaluate expression, see console log for details');
                }
            }
        } else {
            console.error('invalid compile request!');
        }

        done();
    }
});



async function processRaw(state: IStoreState, dispatch): Promise<void> {
    const file = getFileState(state);
    const document = await createPPDocument(await createTextDocument(file.uri, file.content));

    dispatch({ type: evt.SOURCE_CODE_PREPROCESSING_COMPLETE, payload: { document } });
}


const navigationLogicHook = createLogic<IStoreState, LocationChangeAction['payload']>({
    type: LOCATION_CHANGE,
    latest: true,
    debounce: 10,

    async process({ getState, action }, dispatch, done) {
        const location = action.payload.location.pathname;
        const sourceFile = getFileState(getState());

        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { view, fx, name } = match.params;
            if (fx && name === RAW_KEYWORD) {
                await processRaw(getState(), dispatch);
            }
        }

        done();
    }
});


// const markersAddLogic = createLogic<IStoreState>({
//     type: evt.SOURCE_CODE_ADD_MARKER_BATCH,
//     debounce: 10000,
//     process: ({ getState, action }, dispatch, done) => done()
// });

// const markersDelLogic = createLogic<IStoreState>({
//     type: evt.SOURCE_CODE_REMOVE_MARKER_BATCH,
//     debounce: 500,
//     process: ({ getState, action }, dispatch, done) => done()
// });

const debuggerResetLogic = createLogic<IStoreState>({
    type: evt.DEBUGGER_RESET,

    async process({ getState, action }, dispatch, done) {
        const $debugger = getDebugger(getState());
        if ($debugger.options.colorize) {
            cleanupMarkers(<IDispatch>dispatch, cleanupDebuggerColorization(getState()));
        }
        done();
    }
});


const debuggerOptionsChangedLogic = createLogic<IStoreState, IDebuggerOptionsChanged['payload']>({
    type: evt.DEBUGGER_OPTIONS_CHANGED,

    async process({ getState, action }, dispatch, done) {
        if (action.payload.options.autocompile === true) {
            dispatch({ type: evt.DEBUGGER_COMPILE });
        }
        if (action.payload.options.colorize === false) {
            cleanupMarkers(<IDispatch>dispatch, cleanupDebuggerColorization(getState()));
        } else {
            const markers = buildDebuggerSourceColorization(getDebugger(getState()), getFileState(getState()));
            emitMarkers(<IDispatch>dispatch, emitDebuggerColorization(markers));
        }
        if (action.payload.options.wasm != VM.isWASM()) {
            dispatch({ type: evt.PLAYGROUND_SWITCH_VM_RUNTIME });
        }
        done();
    }
});


const debuggerStartLogic = createLogic<IStoreState>({
    type: evt.DEBUGGER_START_DEBUG,

    async process({ getState, action }, dispatch, done) {
        const fileState = getFileState(getState());
        const debuggerState = getDebugger(getState());

        if (debuggerState.options.colorize) {
            const markers = buildDebuggerSourceColorization(debuggerState, fileState);
            emitMarkers(<IDispatch>dispatch, emitDebuggerColorization(markers));
        }
        done();
    }
});


const debuggerAutocompileLogic = createLogic<IStoreState>({
    type: evt.SOURCE_CODE_ANALYSIS_COMPLETE,

    process({ getState }, dispatch, done) {
        const debuggerState = getDebugger(getState());

        if (debuggerState.options.autocompile) {
            dispatch({ type: evt.DEBUGGER_COMPILE });
        }

        done();
    }
});


export default [
    updateParserLogic,
    updateSourceContentLogic,
    parsingCompleteLogic,
    debuggerCompileLogic,
    debuggerResetLogic,
    debuggerOptionsChangedLogic,
    debuggerStartLogic,
    debuggerAutocompileLogic,
    // markersAddLogic,
    // markersDelLogic
    navigationLogicHook
];