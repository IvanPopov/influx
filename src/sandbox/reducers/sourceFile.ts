import { assert } from '@lib/common';
import { ConvolutionPackEx } from '@lib/fx/bundles/Bundle';
import * as Bytecode from '@lib/fx/bytecode/VM';
import * as Techniques from '@lib/fx/techniques';
import { IScope } from '@lib/idl/IInstruction';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { StringRef } from '@lib/util/StringRef';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerActions, IDebuggerOptionsChanged, IDebuggerStartDebug, IGraphLoaded, ISourceCodeAddBreakpoint, ISourceCodeAddMarker, ISourceCodeAddMarkerBatch, ISourceCodeAnalysisComplete, ISourceCodeModified, ISourceCodeParsingComplete, ISourceCodePreprocessingComplete, ISourceCodeRemoveBreakpoint, ISourceCodeRemoveMarker, ISourceCodeRemoveMarkerBatch, ISourceCodeSetDefine, ISourceFileActions, ISourceFileDropState, ISourceFileLoaded, ISourceFileLoadingFailed, ISourceFileRequest } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import { IDebuggerState, IFileState, IStoreState } from '@sandbox/store/IStoreState';
import * as Depot from '@sandbox/reducers/depot';

const initialState: IFileState = {
    revision: 0,
    uri: null,
    content: '',
    error: null,
    markers: {},
    breakpoints: [],
    slastDocument: null,
    slDocument: null,
    rawDocument: null,
    defines: [],
    debugger: {
        expression: null,
        bcDocument: null,
        options: {
            colorize: true,
            disableOptimizations: true,
            autocompile: false,
            wasm: Bytecode.isWASM()
        }
    }
};


export default handleActions<IFileState, ISourceFileActions | IDebuggerActions | IGraphLoaded>({
    // hack: intercept filename of graph as main filename
    [evt.GRAPH_LOADED]: (state, action: IGraphLoaded) => 
        ({ ...state, uri: action.payload.filename }),

    // don't update uri separatly from content (!)
    // [evt.SOURCE_FILE_REQUEST]: (state, action: ISourceFileRequest) =>
    //     ({ ...state, uri: action.payload.filename }),

    [evt.SOURCE_FILE_LOADED]: (state, action: ISourceFileLoaded) =>
        ({ ...state, uri: action.payload.filename, content: action.payload.content, revision: 0 }),

    [evt.SOURCE_FILE_LOADING_FAILED]: (state, action: ISourceFileLoadingFailed) =>
        ({
            ...state,
            error: action.payload.error,
            // NOTE: temp solution (clean up all info about prev file)
            content: null,
            debugger: { ...state.debugger, bcDocument: null },
            breakpoints: [],
            slastDocument: null,
            slDocument: null,
            revision: 0,
            wasm: Techniques.isWASM()
        }),

    [evt.SOURCE_FILE_DROP_STATE]: (state, action: ISourceFileDropState) =>
        ({
            ...state,
            error: null,
            content: null,
            debugger: { ...state.debugger, bcDocument: null },
            markers: {},
            breakpoints: [],
            slastDocument: null,
            slDocument: null, 
            revision: 0
        }),

    [evt.SOURCE_CODE_MODIFED]: (state, action: ISourceCodeModified) =>
        ({
            ...state, markers: {}, 
            content: action.payload.content, 
            uri: action.payload.filename || state.uri,
            revision: state.revision + 1
            // , debugger: { entryPoint: null, runtime: null, ...state.debugger } =
        }),

    [evt.SOURCE_CODE_PARSING_COMPLETE]: (state, action: ISourceCodeParsingComplete) =>
        ({ ...state, slastDocument: action.payload.slastDocument }),

    [evt.SOURCE_CODE_ANALYSIS_COMPLETE]: (state, action: ISourceCodeAnalysisComplete) =>
        ({ ...state, slDocument: action.payload.result }),

    [evt.SOURCE_CODE_PREPROCESSING_COMPLETE]: (state, action: ISourceCodePreprocessingComplete) =>
        ({ ...state, rawDocument: action.payload.document }),

    //
    // markers
    //

    [evt.SOURCE_CODE_ADD_MARKER]: (state, action: ISourceCodeAddMarker) =>
        ({ ...state, markers: { ...state.markers, [action.payload.name]: action.payload } }),

    [evt.SOURCE_CODE_REMOVE_MARKER]: (state, action: ISourceCodeRemoveMarker) => {
        const markers = { ...state.markers };
        delete markers[action.payload.name];
        return { ...state, markers };
    },

    [evt.SOURCE_CODE_ADD_MARKER_BATCH]: (state, action: ISourceCodeAddMarkerBatch) => {
        const markers = { ...state.markers };
        action.payload.batch.forEach(desc => markers[desc.name] = desc);
        return { ...state, markers };
    },

    [evt.SOURCE_CODE_REMOVE_MARKER_BATCH]: (state, action: ISourceCodeRemoveMarkerBatch) => {
        const markers = { ...state.markers };
        action.payload.batch.forEach(name => {
            delete markers[name];
        });
        return { ...state, markers };
    },

    //
    // breakpoints
    //

    [evt.SOURCE_CODE_ADD_BREAKPOINT]: (state, action: ISourceCodeAddBreakpoint) => {
        assert(state.breakpoints.indexOf(action.payload.line) === -1);
        return ({ ...state, breakpoints: [...state.breakpoints, action.payload.line] })
    },

    [evt.SOURCE_CODE_REMOVE_BREAKPOINT]: (state, action: ISourceCodeRemoveBreakpoint) => {
        return { ...state, breakpoints: state.breakpoints.filter(ln => ln !== action.payload.line) };
    },

    [evt.SOURCE_CODE_SET_DEFINE]: (state, { payload: { name } }: ISourceCodeSetDefine) => {
        return { ...state, defines: [ name, ...state.defines.filter(def => def != name) ] };
    },

    [evt.SOURCE_CODE_REMOVE_DEFINE]: (state, { payload: { name } }: ISourceCodeSetDefine) => {
        return { ...state, defines: state.defines.filter(def => def != name) };
    },

    //
    // debugger
    //

    [evt.DEBUGGER_START_DEBUG]: (state, action: IDebuggerStartDebug) => {
        const options = state.debugger.options;
        const { expression, bcDocument } = action.payload;
        return { ...state, debugger: { expression, bcDocument, options } };
    },

    [evt.DEBUGGER_RESET]: (state) => {
        const { debugger: { options } } = state;
        return { ...state, debugger: { expression: null, bcDocument: null, options, layout: 'i32' } };
    },

    [evt.DEBUGGER_OPTIONS_CHANGED]: (state: IFileState, action: IDebuggerOptionsChanged) => {
        const options = { ...state.debugger.options, ...action.payload.options };
        const $debugger = { ...state.debugger, options };
        // console.log(JSON.stringify(options, null, '\t'));
        return { ...state, debugger: $debugger };
    },
}, initialState);


//- Selectors

// export const getFileStateNoMarkers = (state: IStoreState): IFileState => ({ ...state.sourceFile, markers: null });
export const getFileState = (state: IStoreState): IFileState => state.sourceFile;
export const getDebugger = (state: IStoreState): IDebuggerState => getFileState(state).debugger;
export const getScope = (file: IFileState): IScope => file.slDocument ? file.slDocument.root.scope : null;

export const getRawContent = (file: IFileState): string => file.rawDocument ? file.rawDocument.source : null;
export const asTextDocument = ({ uri, content }: IFileState): ITextDocument => ({ uri: StringRef.make(uri), source: content });
export const asSLASTDocument = (file: IFileState) => file.slastDocument;

export const asConvolutionPack = (state: IStoreState): ConvolutionPackEx => {
    const file = state.sourceFile;
    const depot = state.depot;
    const textDocument = asTextDocument(file);
    const slastDocument = asSLASTDocument(file);
    const includeResolver = Depot.makeResolver(depot);
    const defines = file.defines;

    return new ConvolutionPackEx(textDocument, slastDocument, includeResolver, defines);
}
