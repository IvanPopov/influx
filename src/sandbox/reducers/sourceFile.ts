import { ISourceFileActions, ISourceFileRequest, ISourceFileLoadingFailed, 
         ISourceCodeModified, ISourceCodeAddMarker, ISourceFileLoaded, 
         ISourceCodeRemoveMarker } from '../actions/ActionTypes';
import { SOURCE_FILE_REQUEST, SOURCE_FILE_LOADED, 
         SOURCE_FILE_LOADING_FAILED, SOURCE_CODE_MODIFED, 
         SOURCE_CODE_ADD_MARKER, SOURCE_CODE_REMOVE_MARKER } from '../actions/ActionTypeKeys';
import { IFileState, IStoreState } from '../store/IStoreState';
import { State } from "../../lib/parser/State";
import { handleActions } from "./handleActions";


const initialState: IFileState = {
    filename: null,
    content: null,
    fetched: false,
    fetching: false,
    error: null,
    markers: {}
};


export default handleActions<IFileState, ISourceFileActions>({
    [ SOURCE_FILE_REQUEST ]: (state, action: ISourceFileRequest) =>
        ({ ...state, filename: action.payload.filename, fetching: true }),

    [ SOURCE_FILE_LOADED ]: (state, action: ISourceFileLoaded) =>
        ({ ...state, content: action.payload.content, fetching: false, fetched: true }),

    [ SOURCE_FILE_LOADING_FAILED ]: (state, action: ISourceFileLoadingFailed) =>
        ({ ...state, error: action.payload.error, fetching: false }),
    
    [ SOURCE_CODE_MODIFED ]: (state, action: ISourceCodeModified) =>
        ({ ...state, content: action.payload.content }),

    [ SOURCE_CODE_ADD_MARKER ]: (state, action: ISourceCodeAddMarker) =>
        ({ ...state, markers: { ...state.markers, [action.payload.name]: action.payload } }),

    [ SOURCE_CODE_REMOVE_MARKER ]: (state, action: ISourceCodeRemoveMarker) => {
            let markers = { ...state.markers };
            delete markers[action.payload.name];
            return { ...state, markers };
    }
}, initialState);


//- Selectors

export const getSourceCode = (state: IStoreState): IFileState => state.sourceFile;