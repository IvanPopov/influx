import { EParseMode, EParserType, IRange, IParseTree } from '@lib/idl/parser/IParser';
import * as evt from './ActionTypeKeys';
import { IMarker } from '@sandbox/store/IStoreState';

export interface IBaseAction<T extends String> {
    readonly type: T;
}
export interface IAction<T extends String, P> extends IBaseAction<T> {
    readonly payload?: P;
}

//
// source file api
//

export type ISourceFileRequest          = IAction<typeof evt.SOURCE_FILE_REQUEST, { filename: string }>;
export type ISourceFileLoaded           = IAction<typeof evt.SOURCE_FILE_LOADED, { content: string }>;
export type ISourceFileLoadingFailed    = IAction<typeof evt.SOURCE_FILE_LOADING_FAILED, { error: Error }>;
export type ISourceCodeModified         = IAction<typeof evt.SOURCE_CODE_MODIFED, { content: string }>;
export type ISourceCodeAstCreated       = IAction<typeof evt.SOURCE_CODE_PARSE_TREE_CHANGED, { parseTree: IParseTree }>;


export interface IMarkerDesc extends IMarker {
    name: string;
}

export type ISourceCodeAddMarker        = IAction<typeof evt.SOURCE_CODE_ADD_MARKER, IMarkerDesc>;
export type ISourceCodeRemoveMarker     = IAction<typeof evt.SOURCE_CODE_REMOVE_MARKER, { name: string }>;
export type ISourceCodeAddBreakpoint    = IAction<typeof evt.SOURCE_CODE_ADD_BREAKPOINT, { line: number }>;
export type ISourceCodeRemoveBreakpoint    = IAction<typeof evt.SOURCE_CODE_REMOVE_BREAKPOINT, { line: number }>;

export type ISourceFileActions = 
    ISourceFileRequest | ISourceFileLoaded | ISourceFileLoadingFailed | 
    ISourceCodeModified | ISourceCodeAddMarker | ISourceCodeRemoveMarker | 
    ISourceCodeAddBreakpoint | ISourceCodeRemoveBreakpoint | ISourceCodeAstCreated;

//
// grammar api (simplified)
//

export type IGrammarFileSpecified       = IAction<typeof evt.GRAMMAR_FILE_SPECIFIED, { filename: string; }>;
export type IGrammarContentSpecified    = IAction<typeof evt.GRAMMAR_CONTENT_SPECIFIED, { content: string; }>;
export type IParserParamsChanged        = IAction<typeof evt.PARSER_PARAMS_CHANGED, { mode: number; type: EParserType; }>;


export type IParserParamsActions = IGrammarFileSpecified | IGrammarContentSpecified | IParserParamsChanged;

export type ActionTypes = ISourceFileActions & IParserParamsActions;

export default ActionTypes;
