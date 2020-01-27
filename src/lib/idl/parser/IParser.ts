import { IDiagnosticReport, IDiagnostics } from '@lib/idl/IDiagnostics';
import { IMap } from '@lib/idl/IMap';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { StringRef } from "@lib/util/StringRef";

export enum ENodeCreateMode {
    k_Default,
    k_Necessary,
    k_Expose,
    k_Skip
}

export enum EParserCode {
    // k_Pause,
    k_Ok,
    k_Error
}

export enum EParserType {
    k_LR0,
    k_LR1,
    k_LALR
}

export enum IASTDocumentFlags {
    k_Optimize = 0x0008,
    k_DeveloperMode = 0x0010
}


export enum EParserFlags {
    k_ForceAppendAll = 0x0001,
    k_AllowExposeMode = 0x0002,
    k_AllowAddMode = 0x0004,
    k_AllowSkipMode = 0x008,
    k_Default = k_AllowAddMode | k_AllowExposeMode | k_AllowSkipMode,
    k_Debug = 0x0010
}


export enum ETokenType {
    k_NumericLiteral = 1,
    k_SinglelineCommentLiteral,
    k_MultilineCommentLiteral,
    k_StringLiteral,
    k_PunctuatorLiteral,
    k_WhitespaceLiteral,
    k_EscapeSequence,
    k_NewlineLiteral,
    k_IdentifierLiteral,
    k_KeywordLiteral,
    K_MacroLiteral,
    k_Unknown,
    k_End
}


export type IFile = StringRef;

export interface IPosition {
    file: IFile;
    line: number; 
    column: number;
    offset?: number;
}

// todo: add support for range over multiple files;
export interface IRange {
    start: IPosition;
    end: IPosition;

    // see "Preprocessor.ts" for more details
    // source?: IRange;
}

export interface IToken {
    index: number;
    value: string;

    name?: string;
    type?: ETokenType;

    loc?: IRange;
}


/**
 * Grammar rule corresponding to the entry from grammar file.
 */
export interface IRule {
    left: string;
    right: string[];

    /**
     * rule index based on parser's '_nRules'; 
     */
    index: number;
}

export enum EOperationType {
    k_Error = 100,
    k_Shift,
    k_Reduce,
    k_Success,
    k_Ok
}

export type IRuleFunction = () => EOperationType | Promise<EOperationType>;

export interface IParseNode {
    children: IParseNode[];
    parent: IParseNode;
    name: string;
    value: string;
    loc?: IRange;
}

export interface IParseTree {
    readonly nodes: IParseNode[];
    readonly lastNode: IParseNode;
    readonly optimized: boolean;
    readonly root: IParseNode;

    addToken(pToken: IToken): void;
    reduceByRule(pRule: IRule, eCreate: ENodeCreateMode): void;
    finishTree(): void;
    
    $pop(loc?: IRange): void;


    /** @deprecated */
    clone(): IParseTree;
    /** @deprecated */
    toString(): string;
    /** @deprecated */
    toHTMLString(node?: IParseNode, padding?: string): string;
}


export interface ILexerEngine {
    readonly keywords: IMap<string>;
    readonly punctuators: IMap<string>;
    readonly punctuatorsFirstSymbols: IMap<boolean>;


    addPunctuator(value: string, name?: string): string;
    addKeyword(value: string, name: string): string;

    getTerminalValueByName(name: string): string;

    isLineTerminator(symbol: string): boolean;
    isKeyword(value: string): boolean;
    isPunctuator(value: string): boolean;
    isNumberStart(ch: string, ch1: string): boolean;
    isCommentStart(ch: string, ch1: string): boolean;
    isStringStart(ch: string): boolean;
    isPunctuatorStart(ch: string): boolean;
    isWhiteSpaceStart(ch: string): boolean;
    isNewlineStart(ch: string): boolean;
    isIdentifierStart(ch: string): boolean;
    isEscapeSequenceStart(ch: string): boolean;
}

export interface ILexerConfig {
    engine?: ILexerEngine;
    knownTypes?: Set<string>;
    skipComments?: boolean;
    allowLineTerminators?: boolean;
}


export interface ILexer {
    readonly document: ITextDocument;
    readonly config: ILexerConfig;

    setTextDocument(textDocument: ITextDocument): ILexer;
    getPosition(): IPosition;
    setPosition(pos: IPosition): void;
    getDiagnosticReport(): IDiagnosticReport;
    getNextToken(): IToken;
    getNextLine(): IToken;
}


export interface IASTConfig {
    parser?: IParser;
    knownTypes?: Set<string>;
    ruleFunctions?: Map<string, IRuleFunction>;
}


export interface IASTDocument {
    readonly uri: IFile;
    readonly diagnosticReport: IDiagnosticReport;
    readonly root: IParseNode;
}




export interface IOperation {
    type: EOperationType;
    rule?: IRule;
    stateIndex?: number;
}

export interface IOperationMap {
    [grammarSymbol: string]: IOperation;
    [stateIndex: number]: IOperation;
}

export interface ISyntaxTable {
    [stateIndex: number]: {
        [terminal: string]: IOperation;
    }
}


export interface IRuleMap {
    [ruleIndex: number]: IRule;
}

export interface IProductions {
    [nonTerminal: string]: IRuleMap;
}

// TODO: remove type
export interface IRuleFunctionMap {
    [grammarSymbolOrFuncName: string]: string;
}

export interface IRuleFunctionDMap {
    [stateIndex: number]: IRuleFunctionMap;
}

export interface IAdditionalFuncInfo {
    name: string;
    position: number;
    rule: IRule;
}

export interface IParser {
    readonly lexerEngine: ILexerEngine;
    readonly syntaxTable: ISyntaxTable;

    findFunctionByState(stateIndex: number, grammarSymbol: string): string
    getRuleCreationMode(nonTerminal: string): ENodeCreateMode;
    getGrammarSymbols(): Map<string, string>;    
}


export interface IParserParams {
    grammar: string;
    flags?: number; // EParserFlags
    type?: EParserType;
}


export type ExpectedSymbols = Set<string>;
