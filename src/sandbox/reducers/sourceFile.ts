import { SOURCE_CODE_MODIFED, SOURCE_FILE_LOADED, SOURCE_FILE_LOADING_FAILED, SOURCE_FILE_REQUEST, SOURCE_CODE_ADD_MARKER, SOURCE_CODE_REMOVE_MARKER } from '../actions/ActionTypeKeys';
import { SourceFileActions } from '../actions/ActionTypes';
import { IFileState, IStoreState } from '../store/IStoreState';

const initialState: IFileState = {
    filename: null,
    content: null,
    fetched: false,
    fetching: false,
    error: null,
    markers: {}
};

const sourceFile = (state: IFileState = initialState, action: SourceFileActions): IFileState => {
    switch (action.type) {
        case SOURCE_FILE_REQUEST:
            return { ...state, filename: action.payload.filename, fetching: true };
        case SOURCE_FILE_LOADED:
            return { ...state, content: action.payload.content, fetching: false, fetched: true };
        case SOURCE_FILE_LOADING_FAILED:
            return { ...state, error: action.payload.error, fetching: false };
        case SOURCE_CODE_MODIFED:
            return { ...state, content: action.payload.content };
        case SOURCE_CODE_ADD_MARKER:
            return { ...state, markers: { [action.payload.name]: action.payload.range } };
        case SOURCE_CODE_REMOVE_MARKER:
            let markers = { ...state.markers };
            delete markers[action.payload.name];
            return { ...state, markers };
        default:
            return state;
    }
};

export default sourceFile;
