import { IMap } from '../IMap';
import { StringRef } from "./../../util/StringRef";
import { IDiagnosticReport } from '../../util/Diagnostics';

export enum ENodeCreateMode {
    k_Default,
    k_Necessary,
    k_Not
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

export enum EParseMode {
    k_AllNode = 0x0001,
    k_Negate = 0x0002,
    k_Add = 0x0004,
    k_Optimize = 0x0008,
    k_DebugMode = 0x0010
}

export enum ETokenType {
    k_NumericLiteral = 1,
    k_CommentLiteral,
    k_StringLiteral,
    k_PunctuatorLiteral,
    k_WhitespaceLiteral,
    k_IdentifierLiteral,
    k_KeywordLiteral,
    k_Unknown,
    k_End
}


export type IFile = StringRef;

export interface IPosition {
    file: IFile;
    line: number; 
    column: number;
}

// todo: add support for range over multiple files;
export interface IRange {
    start: IPosition;
    end: IPosition;
}

export interface IToken {
    value: string;
    name?: string;
    type?: ETokenType;

    loc?: IRange;
    // range?: number[];
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

export type IRuleFunction = () => EOperationType;

export interface IParseNode {
    children: IParseNode[];
    parent: IParseNode;
    name: string;
    value: string;
    loc?: IRange;
}

export interface IParseTree {
    finishTree(): void;

    setOptimizeMode(isOptimize: boolean): void;

    addToken(pToken: IToken): void;
    addNode(node: IParseNode): void;
    reduceByRule(pRule: IRule, eCreate: ENodeCreateMode): void;

    toString(): string;

    clone(): IParseTree;

    getNodes(): IParseNode[];
    getLastNode(): IParseNode;

    getRoot(): IParseNode;
    setRoot(pRoot: IParseNode): void;
    toHTMLString(node?: IParseNode, padding?: string): string;
}


export interface IParserState {
    source: string;
    index: number;
    fileName: IFile;
    tree: IParseTree;
    types: IMap<boolean>;
    stack: number[];
    token: IToken;
    caller: any;
    includeFiles?: IMap<boolean>;
}

export interface IParser {
    isTypeId(value: string): boolean;
    returnCode(node: IParseNode): string;

    init(sGrammar: string, eMode?: EParseMode, eType?: EParserType): boolean;
    parse(source: string): Promise<EParserCode>;

    setParseFileName(sFileName: string): void;
    getParseFileName(): IFile;

    getSyntaxTree(): IParseTree;
    getGrammarSymbols(): Map<string, string>;
    getDiagnostics(): IDiagnosticReport;

    printStates(isPrintOnlyBase?: boolean): void;
    printState(iStateIndex: number, isPrintOnlyBase?: boolean): void;
}
