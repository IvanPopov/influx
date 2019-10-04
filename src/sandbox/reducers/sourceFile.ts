import { assert } from '@lib/common';
import { SOURCE_CODE_ADD_BREAKPOINT, SOURCE_CODE_ADD_MARKER, SOURCE_CODE_MODIFED, SOURCE_CODE_PARSING_COMPLETE, SOURCE_CODE_REMOVE_BREAKPOINT, SOURCE_CODE_REMOVE_MARKER, SOURCE_FILE_LOADED, SOURCE_FILE_LOADING_FAILED, SOURCE_FILE_REQUEST, SOURCE_CODE_ANALYSIS_COMPLETE } from '@sandbox/actions/ActionTypeKeys';
import { ISourceCodeAddBreakpoint, ISourceCodeAddMarker, ISourceCodeParsingComplete, ISourceCodeModified, ISourceCodeRemoveBreakpoint, ISourceCodeRemoveMarker, ISourceFileActions, ISourceFileLoaded, ISourceFileLoadingFailed, ISourceFileRequest, ISourceCodeAnalysisComplete } from '@sandbox/actions/ActionTypes';
import { IFileState, IStoreState } from '@sandbox/store/IStoreState';
import { handleActions } from "@sandbox/reducers/handleActions";


const initialState: IFileState = {
    filename: null,
    content: null,
    error: null,
    markers: {},
    breakpoints: [],
    parseTree: null,
    root: null,
    scope: null
};


export default handleActions<IFileState, ISourceFileActions>({
    [ SOURCE_FILE_REQUEST ]: (state, action: ISourceFileRequest) =>
        ({ ...state, filename: action.payload.filename }),

    [ SOURCE_FILE_LOADED ]: (state, action: ISourceFileLoaded) =>
        ({ ...state, content: action.payload.content }),

    [ SOURCE_FILE_LOADING_FAILED ]: (state, action: ISourceFileLoadingFailed) =>
        ({ ...state, error: action.payload.error }),
    
    [ SOURCE_CODE_MODIFED ]: (state, action: ISourceCodeModified) => 
        ({ ...state, content: action.payload.content }),

    [ SOURCE_CODE_PARSING_COMPLETE ]: (state, action: ISourceCodeParsingComplete) => 
        ({ ...state, parseTree: action.payload.parseTree }),

    [ SOURCE_CODE_ANALYSIS_COMPLETE ]: (state, action: ISourceCodeAnalysisComplete) => 
        ({ ...state, root: action.payload.root, scope: action.payload.scope }),

    //
    // markers
    //

    [ SOURCE_CODE_ADD_MARKER ]: (state, action: ISourceCodeAddMarker) =>
        ({ ...state, markers: { ...state.markers, [action.payload.name]: action.payload } }),

    [ SOURCE_CODE_REMOVE_MARKER ]: (state, action: ISourceCodeRemoveMarker) => {
            let markers = { ...state.markers };
            delete markers[action.payload.name];
            return { ...state, markers };
    },

    //
    // breakpoints
    //

    [ SOURCE_CODE_ADD_BREAKPOINT ]: (state, action: ISourceCodeAddBreakpoint) => {
        assert(state.breakpoints.indexOf(action.payload.line) == -1);
        return ({ ...state, breakpoints: [ ...state.breakpoints, action.payload.line ] })
    },

    [ SOURCE_CODE_REMOVE_BREAKPOINT ]: (state, action: ISourceCodeRemoveBreakpoint) => {
            return { ...state, breakpoints: state.breakpoints.filter(ln => ln != action.payload.line) };
    }
}, initialState);


//- Selectors

export const getSourceCode = (state: IStoreState): IFileState => state.sourceFile;