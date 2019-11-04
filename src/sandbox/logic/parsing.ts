/* tslint:disable:typedef */

import { assert, isNull } from '@lib/common';
import { analyze } from '@lib/fx/Analyzer';
import * as Bytecode from '@lib/fx/bytecode';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import { EffectParser } from '@lib/fx/EffectParser';
import { Parser } from '@lib/parser/Parser';
import { Diagnostics, EDiagnosticCategory } from '@lib/util/Diagnostics';
import { IDispatch } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerCompile, IDebuggerOptionsChanged } from '@sandbox/actions/ActionTypes';
import { getDebugger, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IDebuggerState, IFileState, IMarker } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const PARSING_ERROR_PREFIX = 'parsing-error';
const ANALYSIS_ERROR_PREFIX = 'analysis-error';
const ANALYSIS_WARNING_PREFIX = 'analysis-warning';
const DEBUGGER_COLORIZATION_PREFIX = 'debug-ln-clr';

function cleanupMarkers(state: IStoreState, dispatch: IDispatch, type: IMarkerType, prefix: string) {
    // tslint:disable-next-line:no-for-in
    for (const name in state.sourceFile.markers) {
        if (name.startsWith(`${prefix}-`)) {
            dispatch({ type: evt.SOURCE_CODE_REMOVE_MARKER, payload: { name } });
        }
    }
}

type IMarkerType = IMarker['type'];

function emitMarkers(list, dispatch: IDispatch, type: IMarkerType, prefix: string) {
    list.forEach((err, i) => {
        let { loc, message, payload } = err;
        let marker = {
            name: `${prefix}-${message}-${i}`,
            range: loc,
            type,
            tooltip: message,
            payload
        };
        dispatch({ type: evt.SOURCE_CODE_ADD_MARKER, payload: marker });
    })
}



const emitErrors = (list, dispatch, prefix) => emitMarkers(list, dispatch, 'error', prefix);
const cleanupErrors = (state, dispatch, prefix) => cleanupMarkers(state, dispatch, 'error', prefix);
const emitWarnings = (list, dispatch, prefix) => emitMarkers(list, dispatch, 'warning', prefix);
const cleanupWarnings = (state, dispatch, prefix) => cleanupMarkers(state, dispatch, 'warning', prefix);
const emitDebuggerColorization = (list, dispatch) => emitMarkers(list, dispatch, 'line', DEBUGGER_COLORIZATION_PREFIX);
const cleanupDebuggerColorization = (state, dispatch) => cleanupMarkers(state, dispatch, 'line', DEBUGGER_COLORIZATION_PREFIX);


async function processParsing(state: IStoreState, dispatch): Promise<void> {
    const { content, filename } = state.sourceFile;

    cleanupErrors(state, dispatch, PARSING_ERROR_PREFIX);

    if (!content) {
        return;
    }

    let { ast, diag, result } = await Parser.parse(content, filename);

    const errors = diag.messages
        .filter(msg => msg.category === EDiagnosticCategory.ERROR)
        .map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));

    emitErrors(errors, dispatch, PARSING_ERROR_PREFIX);

    console.log(Diagnostics.stringify(diag));
    dispatch({ type: evt.SOURCE_CODE_PARSING_COMPLETE, payload: { parseTree: ast } });
}


async function processAnalyze(state: IStoreState, dispatch): Promise<void> {
    const { parseTree, filename } = state.sourceFile;

    cleanupErrors(state, dispatch, ANALYSIS_ERROR_PREFIX);
    cleanupWarnings(state, dispatch, ANALYSIS_WARNING_PREFIX);

    if (!parseTree) {
        return;
    }

    const result = analyze(parseTree, filename);

    const { diag, root, scope } = result;

    const errors = diag.messages.map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));
    emitErrors(errors, dispatch, ANALYSIS_ERROR_PREFIX);

    const warnings = diag.messages
        .filter(msg => msg.category === EDiagnosticCategory.WARNING)
        .map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));

    emitWarnings(warnings, dispatch, ANALYSIS_ERROR_PREFIX);

    console.log(Diagnostics.stringify(diag));

    dispatch({ type: evt.SOURCE_CODE_ANALYSIS_COMPLETE, payload: { result } });
}


const updateParserLogic = createLogic<IStoreState>({
    type: [evt.GRAMMAR_CONTENT_SPECIFIED, evt.PARSER_PARAMS_CHANGED],

    async process({ getState, action }, dispatch, done) {
        const parserParams = getState().parserParams;
        /**
         * !!! note: all inline functionality inside analyze.ts depends on this setup
         */
        const isOk = Parser.init(parserParams, EffectParser);
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
        if (!getDebugger(getState()).options.autocompile) {
            dispatch({ type: evt.DEBUGGER_RESET });
        }

        await processParsing(getState(), dispatch);

        // let begin = Date.now();

        // action$.pipe(
        //     filter(a => a.type === evt.SOURCE_CODE_ANALYSIS_COMPLETE),
        //     take(1) // we only wait for one and then finish
        // ).subscribe({ complete: () => {
        //     console.log('await SOURCE_CODE_PARSING_COMPLETE', Date.now() - begin);
        //     done()
        //  } })

        // console.log('await SOURCE_CODE_PARSING_COMPLETE', Date.now() - begin);

        done();
    }
});


const parsingCompleteLogic = createLogic<IStoreState>({
    type: [evt.SOURCE_CODE_PARSING_COMPLETE],

    async process({ getState, action, action$ }, dispatch, done) {
        await processAnalyze(getState(), dispatch);

        // let begin = Date.now();

        // action$.pipe(
        //     filter(a => a.type === evt.SOURCE_CODE_ANALYSIS_COMPLETE),
        //     take(1) // we only wait for one and then finish
        // ).subscribe({ complete: () => {
        //     console.log('await SOURCE_CODE_ANALYSIS_COMPLETE', Date.now() - begin);
        //     done()
        //  } })

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

        for (let ln = from; ln <= to; ++ ln) {
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
        const entryPoint = (action.payload && action.payload.entryPoint) || debuggerState.entryPoint ||Bytecode.DEFAULT_ENTRY_POINT_NAME;

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


const debuggerResetLogic = createLogic<IStoreState>({
    type: evt.DEBUGGER_RESET,

    async process({ getState, action }, dispatch, done) {
        const $debugger = getDebugger(getState());
        if ($debugger.options.colorize) {
            cleanupDebuggerColorization(getState(), dispatch);
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
            cleanupDebuggerColorization(getState(), dispatch);
        } else {
            const markers = buildDebuggerSourceColorization(getDebugger(getState()), getFileState(getState()));
            emitDebuggerColorization(markers, dispatch);
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
            emitDebuggerColorization(markers, dispatch);
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
    debuggerAutocompileLogic
];