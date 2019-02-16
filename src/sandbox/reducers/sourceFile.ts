import { ISourceFileActions, ISourceFileRequest, ISourceFileLoadingFailed, 
         ISourceCodeAstCreated as ISourceCodeParseTreeChanged, ISourceCodeModified, ISourceCodeAddMarker, ISourceFileLoaded, 
         ISourceCodeRemoveMarker, ISourceCodeAddBreakpoint, ISourceCodeRemoveBreakpoint } from '../actions/ActionTypes';
import { SOURCE_FILE_REQUEST, SOURCE_FILE_LOADED, 
         SOURCE_FILE_LOADING_FAILED, SOURCE_CODE_MODIFED, 
         SOURCE_CODE_ADD_MARKER, SOURCE_CODE_REMOVE_MARKER, SOURCE_CODE_CLEANUP_MARKERS, 
         SOURCE_CODE_ADD_BREAKPOINT, SOURCE_CODE_REMOVE_BREAKPOINT, SOURCE_CODE_PARSE_TREE_CHANGED } from '../actions/ActionTypeKeys';
import { IFileState, IStoreState } from '../store/IStoreState';
import { handleActions } from "./handleActions";
import { assert } from '../../lib/common';


const initialState: IFileState = {
    filename: null,
    content: null,
    error: null,
    markers: {},
    breakpoints: [],
    parseTree: null
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

    [ SOURCE_CODE_PARSE_TREE_CHANGED ]: (state, action: ISourceCodeParseTreeChanged) => 
        ({ ...state, parseTree: action.payload.parseTree }),

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

    [ SOURCE_CODE_CLEANUP_MARKERS ]: (state, action?) => {
        return { ...state, markers: {} };
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