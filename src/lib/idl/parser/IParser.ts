import { IMap } from '../IMap';
import { ILoggerEntity } from '../ILogger';
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

export interface IPosition {
    line: number; 
    column: number;
}

export interface IRange {
    start: IPosition;
    end: IPosition;
}

export interface IToken {
    value: string;
    name?: string;
    type?: ETokenType;

    loc?: IRange;
    range?: number[];
}

export interface IRule {
    left: string;
    right: string[];
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
    addNode(pNode: IParseNode): void;
    reduceByRule(pRule: IRule, eCreate: ENodeCreateMode): void;

    toString(): string;

    clone(): IParseTree;

    getNodes(): IParseNode[];
    getLastNode(): IParseNode;

    getRoot(): IParseNode;
    setRoot(pRoot: IParseNode): void;
    toHTMLString(pNode?: IParseNode, padding?: string): string;
}

export interface ILexer {
    addPunctuator(sValue: string, sName?: string): string;
    addKeyword(sValue: string, sName: string): string;

    getTerminalValueByName(sName: string): string;

    init(sSource: string): void;

    getNextToken(): IToken | null;
    getIndex(): number;
    setSource(sSource: string): void;
    setIndex(iIndex: number): void;

    getDiagnostics(): IDiagnosticReport;
}

export interface IParserState {
    source: string;
    index: number;
    fileName: string;
    tree: IParseTree;
    types: IMap<boolean>;
    stack: number[];
    token: IToken;
    caller: any;
    includeFiles?: IMap<boolean>;
}

export interface IParser {
    isTypeId(sValue: string): boolean;
    returnCode(pNode: IParseNode): string;

    init(sGrammar: string, eMode?: EParseMode, eType?: EParserType): boolean;
    parse(sSource: string): Promise<EParserCode>;

    setParseFileName(sFileName: string): void;
    getParseFileName(): string;

    getSyntaxTree(): IParseTree;
    getGrammarSymbols(): IMap<string>;
    getDiagnostics(): IDiagnosticReport;

    printStates(isPrintOnlyBase?: boolean): void;
    printState(iStateIndex: number, isPrintOnlyBase?: boolean): void;
}
