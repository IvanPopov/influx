/* tslint:disable:typedef */

import { assert, isNull, verbose } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { EffectParser } from '@lib/fx/SLParser';
import { ParserEngine } from '@lib/parser/Parser';
import { IDispatch } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerCompile, IDebuggerOptionsChanged, IMarkerDesc } from '@sandbox/actions/ActionTypes';
import { getDebugger, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IDebuggerState, IFileState, IMarker } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const DEBUGGER_COLORIZATION_PREFIX = 'debug-ln-clr';

declare const PRODUCTION: boolean;

function cleanupMarkersBatch(state: IStoreState, prefix: string): string[] {
    return Object
        .keys(state.sourceFile.markers)
        .filter(name => name.startsWith(`${prefix}-`));
}

function cleanupMarkers(dispatch: IDispatch, batch: string[]) {
    if (batch.length > 0){
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
    const { content, filename } = state.sourceFile;
    const { parsingFlags } = state.parserParams;

    if (!content) {
        return;
    }

    const { ast, diag } = await ParserEngine.parse(content, { filename, flags: parsingFlags });

    if (!PRODUCTION) {
        // verbose(Diagnostics.stringify(diag));
    }

    // if (!diag.errors)
    {
        dispatch({ type: evt.SOURCE_CODE_PARSING_COMPLETE, payload: { parseTree: ast } });
    }
}


async function processAnalyze(state: IStoreState, dispatch: IDispatch): Promise<void> {
    const { parseTree, filename } = state.sourceFile;

    if (!parseTree) {
        return;
    }

    const result = FxAnalyzer.analyze(parseTree, filename);
    const { diag } = result;

    if (!PRODUCTION) {
        // verbose(Diagnostics.stringify(diag));
    }

    // if (!diag.errors)
    {
        dispatch({ type: evt.SOURCE_CODE_ANALYSIS_COMPLETE, payload: { result } });
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
        const isOk = ParserEngine.init({ grammar, type, flags }, EffectParser);
        assert(isOk);
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
    const fn = fileState.analysis.root.scope.findFunction(debuggerState.entryPoint, null);
    const locList = [];

    if (fn && debuggerState.runtime) {
        // const from = fn.sourceNode.loc.start.line;
        // const to = fn.sourceNode.loc.end.line;

        const from = 0;
        const to = fileState.content.split('\n').length;

        const cdl = cdlview(debuggerState.runtime.cdl);

        for (let ln = from; ln <= to; ++ln) {
            const color = cdl.resolveLineColor(ln);
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
        const entryPoint = (action.payload && action.payload.entryPoint) || debuggerState.entryPoint || Bytecode.DEFAULT_ENTRY_POINT_NAME;

        let runtime = null;

        if (!isNull(file.analysis.scope)) {
            const scope = getScope(file);
            const func = scope.findFunction(entryPoint, null);
            runtime = Bytecode.translate(func);
            dispatch({ type: evt.DEBUGGER_START_DEBUG, payload: { entryPoint, runtime } });
        } else {
            console.error('invalid compile request!');
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
];