import { assert } from '@lib/common';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { ISourceCodeAddBreakpoint, ISourceCodeAddMarker, ISourceCodeParsingComplete, ISourceCodeModified, ISourceCodeRemoveBreakpoint, ISourceCodeRemoveMarker, ISourceFileActions, ISourceFileLoaded, ISourceFileLoadingFailed, ISourceFileRequest, ISourceCodeAnalysisComplete, IDebuggerStartDebug, IDebuggerActions, IDebuggerOptionsChanged } from '@sandbox/actions/ActionTypes';
import { IFileState, IStoreState, IDebuggerState } from '@sandbox/store/IStoreState';
import { handleActions } from '@sandbox/reducers/handleActions';


const initialState: IFileState = {
    filename: null,
    content: null,
    error: null,
    markers: {},
    breakpoints: [],
    parseTree: null,
    root: null,
    scope: null,
    debugger: {
        entryPoint: null,
        runtime: null,
        options: {
            colorize: true,
            disableOptimizations: true,
            autocompile: false
        }
    }
};


export default handleActions<IFileState, ISourceFileActions | IDebuggerActions>({
    [ evt.SOURCE_FILE_REQUEST ]: (state, action: ISourceFileRequest) =>
        ({ ...state, filename: action.payload.filename }),

    [ evt.SOURCE_FILE_LOADED ]: (state, action: ISourceFileLoaded) =>
        ({ ...state, content: action.payload.content }),

    [ evt.SOURCE_FILE_LOADING_FAILED ]: (state, action: ISourceFileLoadingFailed) =>
        ({ ...state, error: action.payload.error }),
    
    [ evt.SOURCE_CODE_MODIFED ]: (state, action: ISourceCodeModified) => 
        ({ ...state, content: action.payload.content
            // , debugger: { entryPoint: null, runtime: null, ...state.debugger } 
        }),

    [ evt.SOURCE_CODE_PARSING_COMPLETE ]: (state, action: ISourceCodeParsingComplete) => 
        ({ ...state, parseTree: action.payload.parseTree }),

    [ evt.SOURCE_CODE_ANALYSIS_COMPLETE ]: (state, action: ISourceCodeAnalysisComplete) => 
        ({ ...state, root: action.payload.root, scope: action.payload.scope }),

    //
    // markers
    //

    [ evt.SOURCE_CODE_ADD_MARKER ]: (state, action: ISourceCodeAddMarker) =>
        ({ ...state, markers: { ...state.markers, [action.payload.name]: action.payload } }),

    [ evt.SOURCE_CODE_REMOVE_MARKER ]: (state, action: ISourceCodeRemoveMarker) => {
            let markers = { ...state.markers };
            delete markers[action.payload.name];
            return { ...state, markers };
    },

    //
    // breakpoints
    //

    [ evt.SOURCE_CODE_ADD_BREAKPOINT ]: (state, action: ISourceCodeAddBreakpoint) => {
        assert(state.breakpoints.indexOf(action.payload.line) == -1);
        return ({ ...state, breakpoints: [ ...state.breakpoints, action.payload.line ] })
    },

    [ evt.SOURCE_CODE_REMOVE_BREAKPOINT ]: (state, action: ISourceCodeRemoveBreakpoint) => {
            return { ...state, breakpoints: state.breakpoints.filter(ln => ln != action.payload.line) };
    },

    // 
    // debugger
    //

    [ evt.DEBUGGER_START_DEBUG ]: (state, action: IDebuggerStartDebug) => {
        let options = state.debugger.options;
        let { entryPoint, runtime } = action.payload;
        return { ...state, debugger: { entryPoint, runtime, options }  };
    },

    [ evt.DEBUGGER_RESET ]: (state) => {
        const { debugger: { options } } = state;
        return { ...state, debugger: { entryPoint: null, runtime: null, options } };
    },

    [ evt.DEBUGGER_OPTIONS_CHANGED ]: (state: IFileState, action: IDebuggerOptionsChanged) => {
        const options = { ...state.debugger.options, ...action.payload.options };
        const $debugger = { ...state.debugger, options };
        console.log(JSON.stringify(options, null, '\t'));
        return { ...state, debugger: $debugger };
    }

}, initialState);


//- Selectors

/** @deprecated */
export const getSourceCode = (state: IStoreState): IFileState => state.sourceFile;
/** @deprecated */
export const getDebugger = (state: IStoreState): IDebuggerState => state.sourceFile.debugger;