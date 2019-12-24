import { MakeOptional } from '@lib/common';
import { ISubProgram } from '@lib/fx/bytecode/Bytecode';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { EParserType } from '@lib/idl/parser/IParser';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IDebuggerState, IMarker } from '@sandbox/store/IStoreState';

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
export type ISourceFileLoaded = IAction<typeof evt.SOURCE_FILE_LOADED, { content: string }>;
export type ISourceFileLoadingFailed = IAction<typeof evt.SOURCE_FILE_LOADING_FAILED, { error: Error }>;
export type ISourceFileDropState = IAction<typeof evt.SOURCE_FILE_DROP_STATE, {}>;
export type ISourceCodeModified = IAction<typeof evt.SOURCE_CODE_MODIFED, { content: string; filename?: string }>;
export type ISourceCodeParsingComplete = IAction<typeof evt.SOURCE_CODE_PARSING_COMPLETE, { slastDocument: ISLASTDocument }>;
export type ISourceCodeAnalysisComplete = IAction<typeof evt.SOURCE_CODE_ANALYSIS_COMPLETE, { result: ISLDocument }>;

export interface IMarkerDesc extends IMarker {
    name: string;
}

export type ISourceCodeAddMarker = IAction<typeof evt.SOURCE_CODE_ADD_MARKER, IMarkerDesc>;
export type ISourceCodeRemoveMarker = IAction<typeof evt.SOURCE_CODE_REMOVE_MARKER, { name: string }>;
export type ISourceCodeAddMarkerBatch = IAction<typeof evt.SOURCE_CODE_ADD_MARKER_BATCH, { batch: IMarkerDesc[] }>;
export type ISourceCodeRemoveMarkerBatch = IAction<typeof evt.SOURCE_CODE_REMOVE_MARKER_BATCH, { batch: string[] }>;

export type ISourceCodeAddBreakpoint = IAction<typeof evt.SOURCE_CODE_ADD_BREAKPOINT, { line: number }>;
export type ISourceCodeRemoveBreakpoint = IAction<typeof evt.SOURCE_CODE_REMOVE_BREAKPOINT, { line: number }>;

export type ISourceFileActions =
    ISourceFileRequest | ISourceFileLoaded | ISourceFileLoadingFailed | ISourceFileDropState |
    ISourceCodeModified | ISourceCodeAddMarker | ISourceCodeRemoveMarker |
    ISourceCodeAddBreakpoint | ISourceCodeRemoveBreakpoint | ISourceCodeParsingComplete |
    ISourceCodeAnalysisComplete | ISourceCodeAddMarkerBatch | ISourceCodeRemoveMarkerBatch;

//
// debugger api
//

export type IDebuggerCompile = IAction<typeof evt.DEBUGGER_COMPILE, { expression: string }>;
export type IDebuggerReset = IAction<typeof evt.DEBUGGER_RESET, {}>;
// tslint:disable-next-line:max-line-length
export type IDebuggerStartDebug = IAction<typeof evt.DEBUGGER_START_DEBUG, { expression: string; runtime: ISubProgram; layout: 'f32' | 'i32' }>;
export type IDebuggerOptionsChanged = IAction<typeof evt.DEBUGGER_OPTIONS_CHANGED, { options: MakeOptional<IDebuggerState['options']> }>;

export type IDebuggerActions = IDebuggerCompile | IDebuggerReset | IDebuggerStartDebug | IDebuggerOptionsChanged;

//
// playground
//

export type IPlaygroundPipelineUpdate = IAction<typeof evt.PLAYGROUND_PIPELINE_UPDATE, { pipeline: any }>;
export type IPlaygroundSelectEffect = IAction<typeof evt.PLAYGROUND_SELECT_EFFECT, { name: string }>;
export type IPlaygroundActions = IPlaygroundPipelineUpdate | IPlaygroundSelectEffect;

//
// grammar api (simplified)
//

export type IGrammarContentSpecified = IAction<typeof evt.GRAMMAR_CONTENT_SPECIFIED, { content: string }>;
export type IParserParamsChanged = IAction<typeof evt.PARSER_PARAMS_CHANGED, { flags: number; type: EParserType }>;
export type IParsingParamsChanged = IAction<typeof evt.PARSING_PARAMS_CHANGED, { flags: number }>;


export type IParserParamsActions = IGrammarContentSpecified | IParserParamsChanged |
    IParsingParamsChanged;

export type ActionTypes = ISourceFileActions & IParserParamsActions & IDebuggerActions & IPlaygroundActions;

export default ActionTypes;
