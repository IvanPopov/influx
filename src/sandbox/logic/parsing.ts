import { assert } from '@lib/common';
import { analyze } from '@lib/fx/Analyzer';
import { EffectParser } from '@lib/fx/EffectParser';
import { Parser } from '@lib/parser/Parser';
import { Diagnostics, EDiagnosticCategory } from '@lib/util/Diagnostics';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import IStoreState from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';

const PARSING_ERROR_PREFIX = 'parsing-error';
const ANALYSIS_ERROR_PREFIX = 'analysis-error';
const ANALYSIS_WARNING_PREFIX = 'analysis-warning';

function cleanupMarkers(state, dispatch, type, prefix) {
    for (let name in state.sourceFile.markers) {
        if (name.startsWith(`${prefix}-`)) {
            dispatch({ type: evt.SOURCE_CODE_REMOVE_MARKER, payload: { name } });
        }
    }
}

function emitMarkers(errors, dispatch, type, prefix) {
    errors.forEach(err => {
        let { loc, message } = err;
        let marker = {
            name: `${prefix}-${message}`,
            range: loc,
            type,
            tooltip: message
        };
        dispatch({ type: evt.SOURCE_CODE_ADD_MARKER, payload: marker });
    })
}



const emitErrors = (list, dispatch, prefix) => emitMarkers(list, dispatch, 'error', prefix);
const cleanupErrors = (state, dispatch, prefix) => cleanupMarkers(state, dispatch, 'error', prefix);
const emitWarnings = (list, dispatch, prefix) => emitMarkers(list, dispatch, 'warning', prefix);
const cleanupWarnings = (state, dispatch, prefix) => cleanupMarkers(state, dispatch, 'warning', prefix);


async function processParsing(state: IStoreState, dispatch): Promise<void> {
    const { content, filename } = state.sourceFile;

    cleanupErrors(state, dispatch, PARSING_ERROR_PREFIX);

    if (!content) {
        return;
    }

    let { ast, diag, result } = await Parser.parse(content, filename);

    let errors = diag.messages.filter(msg => msg.category == EDiagnosticCategory.ERROR).map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));
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

    const res = analyze(parseTree, filename);

    let { diag, root, scope } = res;

    let errors = diag.messages.map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));
    emitErrors(errors, dispatch, ANALYSIS_ERROR_PREFIX);

    let warnings = diag.messages.filter(msg => msg.category == EDiagnosticCategory.WARNING).map(msg => ({ loc: Diagnostics.asRange(msg), message: msg.content }));
    emitWarnings(warnings, dispatch, ANALYSIS_ERROR_PREFIX);

    console.log(Diagnostics.stringify(diag));

    dispatch({ type: evt.SOURCE_CODE_ANALYSIS_COMPLETE, payload: { root, scope } });
}


const updateParserLogic = createLogic<IStoreState>({
    type: [evt.GRAMMAR_CONTENT_SPECIFIED, evt.PARSER_PARAMS_CHANGED],

    async process({ getState, action }, dispatch, done) {
        let parserParams = getState().parserParams;
        /**
         * !!! note: all inline functionality inside analyze.ts depends on this setup
         */
        let isOk = Parser.init(parserParams, EffectParser);
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



export default [
    updateParserLogic,
    updateSourceContentLogic,
    parsingCompleteLogic
];