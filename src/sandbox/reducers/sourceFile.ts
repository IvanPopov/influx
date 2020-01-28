import { assert } from '@lib/common';
import { ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerActions, IDebuggerOptionsChanged, IDebuggerStartDebug, IPlaygroundActions, IPlaygroundEmitterUpdate, ISourceCodeAddBreakpoint, ISourceCodeAddMarker, ISourceCodeAddMarkerBatch, ISourceCodeAnalysisComplete, ISourceCodeModified, ISourceCodeParsingComplete, ISourceCodeRemoveBreakpoint, ISourceCodeRemoveMarker, ISourceCodeRemoveMarkerBatch, ISourceFileActions, ISourceFileDropState, ISourceFileLoaded, ISourceFileLoadingFailed, ISourceFileRequest, ISourceCodePreprocessingComplete } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import { IDebuggerState, IFileState, IStoreState } from '@sandbox/store/IStoreState';

const initialState: IFileState = {
    uri: null,
    content: '',
    contentModified: null,
    error: null,
    markers: {},
    breakpoints: [],
    slastDocument: null,
    slDocument: null,
    rawDocument: null,
    debugger: {
        expression: null,
        runtime: null,
        options: {
            colorize: true,
            disableOptimizations: true,
            autocompile: false
        }
    },
    emitter: null,
    // HACK: additional counter in order to call component's update in case of shadow pipeline reloading
    $pipeline: 0
};


export default handleActions<IFileState, ISourceFileActions | IDebuggerActions | IPlaygroundActions>({
    [evt.SOURCE_FILE_REQUEST]: (state, action: ISourceFileRequest) =>
        ({ ...state, uri: action.payload.filename }),

    [evt.SOURCE_FILE_LOADED]: (state, action: ISourceFileLoaded) =>
        ({ ...state, content: action.payload.content }),

    [evt.SOURCE_FILE_LOADING_FAILED]: (state, action: ISourceFileLoadingFailed) =>
        ({
            ...state,
            error: action.payload.error,
            // NOTE: temp solution (clean up all info about prev file)
            content: null,
            debugger: { ...state.debugger, runtime: null },
            breakpoints: [],
            slASTDocument: null,
            slDocument: null,
            emitter: null,
            $pipeline: 0
        }),

    [evt.SOURCE_FILE_DROP_STATE]: (state, action: ISourceFileDropState) =>
        ({
            ...state,
            error: null,
            content: null,
            debugger: { ...state.debugger, runtime: null },
            breakpoints: [],
            slASTDocument: null,
            slDocument: null,
            emitter: null,
            $pipeline: 0
        }),

    [evt.SOURCE_CODE_MODIFED]: (state, action: ISourceCodeModified) =>
        ({
            ...state, markers: {}, content: action.payload.content, uri: action.payload.filename || state.uri
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

    //
    // debugger
    //

    [evt.DEBUGGER_START_DEBUG]: (state, action: IDebuggerStartDebug) => {
        const options = state.debugger.options;
        const { expression, runtime } = action.payload;
        return { ...state, debugger: { expression, runtime, options } };
    },

    [evt.DEBUGGER_RESET]: (state) => {
        const { debugger: { options } } = state;
        return { ...state, debugger: { expression: null, runtime: null, options, layout: 'i32' } };
    },

    [evt.DEBUGGER_OPTIONS_CHANGED]: (state: IFileState, action: IDebuggerOptionsChanged) => {
        const options = { ...state.debugger.options, ...action.payload.options };
        const $debugger = { ...state.debugger, options };
        // console.log(JSON.stringify(options, null, '\t'));
        return { ...state, debugger: $debugger };
    },

    //
    // playground
    //

    [evt.PLAYGROUND_EMITER_UPDATE]: (state, action: IPlaygroundEmitterUpdate) =>
        ({ ...state, emitter: action.payload.emitter, $pipeline: state.$pipeline + 1 })

}, initialState);


//- Selectors

// export const getFileStateNoMarkers = (state: IStoreState): IFileState => ({ ...state.sourceFile, markers: null });
export const getFileState = (state: IStoreState): IFileState => state.sourceFile;
export const getDebugger = (state: IStoreState): IDebuggerState => getFileState(state).debugger;
export const getScope = (file: IFileState): IScope => file.slDocument ? file.slDocument.root.scope : null;
export const getEmitterName = (file: IFileState) => file.emitter ? file.emitter.name : null;
export function filterPartFx(scope: IScope): IPartFxInstruction[] {
    if (!scope) {
        return [];
    }

    const map = scope.techniques;
    return Object.keys(map)
        .filter(name => map[name].type === ETechniqueType.k_PartFx)
        .map(name => <IPartFxInstruction>map[name]);
}


