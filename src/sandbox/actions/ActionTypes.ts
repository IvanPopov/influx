import { MakeOptional } from '@lib/common';
import { IBCDocument } from '@lib/fx/bytecode/Bytecode';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { EParserType } from '@lib/idl/parser/IParser';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerState, IDepotFolder, IMarker, INodeConstant, IP4Info, IPlaygroundState } from '@sandbox/store/IStoreState';
import { ITextDocument } from '@lib/idl/ITextDocument';
import * as S3D from '@lib/util/s3d/prjenv';

export interface IBaseAction<T extends String> {
    readonly type: T;
}
export interface IAction<T extends String, P> extends IBaseAction<T> {
    readonly payload?: P;
}

//
// source file api
//

export type ISourceFileRequest = IAction<typeof evt.SOURCE_FILE_REQUEST, { filename: string }>;
export type ISourceFileLoaded = IAction<typeof evt.SOURCE_FILE_LOADED, { filename: string, content: string }>;
export type ISourceFileLoadingFailed = IAction<typeof evt.SOURCE_FILE_LOADING_FAILED, { error: Error }>;
export type ISourceFileDropState = IAction<typeof evt.SOURCE_FILE_DROP_STATE, {}>;
export type ISourceCodeModified = IAction<typeof evt.SOURCE_CODE_MODIFED, { content: string; filename?: string }>;
export type ISourceCodeParsingComplete = IAction<typeof evt.SOURCE_CODE_PARSING_COMPLETE, { slastDocument: ISLASTDocument }>;
export type ISourceCodeAnalysisComplete = IAction<typeof evt.SOURCE_CODE_ANALYSIS_COMPLETE, { result: ISLDocument }>;
export type ISourceCodePreprocessingComplete = IAction<typeof evt.SOURCE_CODE_PREPROCESSING_COMPLETE, { document: ITextDocument }>;

export interface IMarkerDesc extends IMarker {
    name: string;
}

export type ISourceCodeAddMarker = IAction<typeof evt.SOURCE_CODE_ADD_MARKER, IMarkerDesc>;
export type ISourceCodeRemoveMarker = IAction<typeof evt.SOURCE_CODE_REMOVE_MARKER, { name: string }>;
export type ISourceCodeAddMarkerBatch = IAction<typeof evt.SOURCE_CODE_ADD_MARKER_BATCH, { batch: IMarkerDesc[] }>;
export type ISourceCodeRemoveMarkerBatch = IAction<typeof evt.SOURCE_CODE_REMOVE_MARKER_BATCH, { batch: string[] }>;

export type ISourceCodeAddBreakpoint = IAction<typeof evt.SOURCE_CODE_ADD_BREAKPOINT, { line: number }>;
export type ISourceCodeRemoveBreakpoint = IAction<typeof evt.SOURCE_CODE_REMOVE_BREAKPOINT, { line: number }>;
export type ISourceCodeSetDefine = IAction<typeof evt.SOURCE_CODE_SET_DEFINE, { name: string }>;
export type ISourceCodeRemoveDefine = IAction<typeof evt.SOURCE_CODE_REMOVE_DEFINE, { name: string }>;

export type ISourceFileActions =
    ISourceFileRequest | ISourceFileLoaded | ISourceFileLoadingFailed | ISourceFileDropState |
    ISourceCodeModified | ISourceCodeAddMarker | ISourceCodeRemoveMarker |
    ISourceCodeAddBreakpoint | ISourceCodeRemoveBreakpoint | ISourceCodeParsingComplete |
    ISourceCodePreprocessingComplete | 
    ISourceCodeAnalysisComplete | ISourceCodeAddMarkerBatch | ISourceCodeRemoveMarkerBatch | 
    ISourceCodeSetDefine | ISourceCodeRemoveDefine;

//
// debugger api
//

export type IDebuggerCompile = IAction<typeof evt.DEBUGGER_COMPILE, { query: string, type: 'expression' | 'pass' }>;
export type IDebuggerReset = IAction<typeof evt.DEBUGGER_RESET, {}>;
// tslint:disable-next-line:max-line-length
export type IDebuggerStartDebug = IAction<typeof evt.DEBUGGER_START_DEBUG, { query: string; bcDocument: IBCDocument; }>;
export type IDebuggerOptionsChanged = IAction<typeof evt.DEBUGGER_OPTIONS_CHANGED, { options: MakeOptional<IDebuggerState['options']> }>;

export type IDebuggerActions = IDebuggerCompile | IDebuggerReset | IDebuggerStartDebug | IDebuggerOptionsChanged;

//
// playground
//

export type IPlaygroundTechniqueUpdate = IAction<typeof evt.PLAYGROUND_TECHNIQUE_UPDATE, { technique: any, controls: any }>;
export type IPlaygroundSelectEffect = IAction<typeof evt.PLAYGROUND_SELECT_EFFECT, { name: string }>;
export type IPlaygroundSwitchVMRuntime = IAction<typeof evt.PLAYGROUND_SWITCH_VM_RUNTIME, { }>;
export type IPlaygroundSwitchTechniqueRuntime = IAction<typeof evt.PLAYGROUND_SWITCH_TECHNIQUE_RUNTIME, { }>;
export type IPlaygroundEffectHasBeenDropped = IAction<typeof evt.PLAYGROUND_EFFECT_HAS_BEEN_DROPPED, { }>;
export type IPlaygroundEffectHasBeenSaved = IAction<typeof evt.PLAYGROUND_EFFECT_HAS_BEEN_SAVED, { filename: string }>;
export type IPlaygroundSetOptionAutosave = IAction<typeof evt.PLAYGROUND_SET_OPTION_AUTOSAVE, { enabled: boolean }>;
export type IPlaygroundEffectSaveRequest = IAction<typeof evt.PLAYGROUND_EFFECT_SAVE_REQUEST, { silent?: boolean }>;
export type IPlaygroundSetShaderFormat = IAction<typeof evt.PLAYGROUND_SET_SHADER_FORMAT, { format: IPlaygroundState['shaderFormat'] }>;
export type IPlaygroundActions = IPlaygroundTechniqueUpdate | IPlaygroundSelectEffect | IPlaygroundSwitchVMRuntime | 
    IPlaygroundSwitchTechniqueRuntime | IPlaygroundEffectHasBeenSaved | IPlaygroundSetOptionAutosave | IPlaygroundEffectSaveRequest |
    IPlaygroundEffectHasBeenDropped | IPlaygroundSetShaderFormat;

//
// grammar api (simplified)
//

export type IGrammarContentSpecified = IAction<typeof evt.GRAMMAR_CONTENT_SPECIFIED, { content: string }>;
export type IParserParamsChanged = IAction<typeof evt.PARSER_PARAMS_CHANGED, { flags: number; type: EParserType }>;
export type IParsingParamsChanged = IAction<typeof evt.PARSING_PARAMS_CHANGED, { flags: number }>;


export type IParserParamsActions = IGrammarContentSpecified | IParserParamsChanged |
    IParsingParamsChanged;

//
// graph api
//

export type IGraphReset = IAction<typeof evt.GRAPH_RESET, {}>;
// emits on any significant graph change
export type IGraphCompile = IAction<typeof evt.GRAPH_COMPILE, {}>;
// emits on any graph change
export type IGraphModified = IAction<typeof evt.GRAPH_MODIFIED, {}>;
// emits on graph node selection if docs is presened
export type IGraphNodeDocsProvided = IAction<typeof evt.GRAPH_NODE_DOCS_PROVIDED, { docs: string }>;
// emits on new serialized graph content has been specified
export type IGraphLoaded = IAction<typeof evt.GRAPH_LOADED, { filename: string, content: string, env?: ISLDocument, constants: INodeConstant[], capacity: number }>;
export type IGraphChangeLayout = IAction<typeof evt.GRAPH_CHANGE_LAYOUT, { layout: string, env?: ISLDocument }>;
export type IGraphAddConstant = IAction<typeof evt.GRAPH_ADD_CONSTANT, { value: INodeConstant }>;
export type IGraphRemoveConstant = IAction<typeof evt.GRAPH_REMOVE_CONSTANT, { name: string }>;
export type IGraphSetConstant = IAction<typeof evt.GRAPH_SET_CONSTANT, { name: string, value: string }>;
export type IGraphSetCapacity = IAction<typeof evt.GRAPH_SET_CAPACITY, { value: number }>;


export type IGraphActions = IGraphReset | IGraphCompile | IGraphNodeDocsProvided | IGraphLoaded |
    IGraphModified | IGraphChangeLayout | IGraphAddConstant | IGraphRemoveConstant | IGraphSetConstant | 
    IGraphSetCapacity;

//
//
//

export type IS3DInitEnv = IAction<typeof evt.S3D_INIT_ENV, { projectRoot: string }>;
export type IS3DInitEnvSuccess = IAction<typeof evt.S3D_INIT_ENV_SUCCESSED, { env: S3D.ProjectEnv }>;
export type IS3DInitEnvFailed = IAction<typeof evt.S3D_INIT_ENV_FAILED, { reason?: string }>;
export type IS3DConnectP4Success = IAction<typeof evt.S3D_CONNECT_P4_SUCCESSED, { info: IP4Info }>;
export type IS3DActions = IS3DInitEnv | IS3DInitEnvSuccess | IS3DInitEnvFailed | IS3DConnectP4Success;

//
//
//

export type IDepotUpdateRequest = IAction<typeof evt.DEPOT_UPDATE_REQUEST, {}>;
export type IDepotUpdateComplete = IAction<typeof evt.DEPOT_UPDATE_COMPLETE, { root: IDepotFolder }>;

export type IDepotActions = IDepotUpdateRequest | IDepotUpdateComplete;

//
//
//

// export type ActionTypes = ISourceFileActions & IParserParamsActions & 
//     IDebuggerActions & IPlaygroundActions & IGraphActions & IS3DActions & 
//     IDepotActions;

// export default ActionTypes;
