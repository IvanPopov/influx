import { IMap } from '../IMap';

export enum ENodeCreateMode {
    k_Default,
    k_Necessary,
    k_Not
}

export enum EParserCode {
    k_Pause,
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

export interface ITokenPosition {
    line: number; 
    column: number;
}

export interface ITokenLocation {
    start: ITokenPosition;
    end: ITokenPosition;
}

export interface IToken {
    value: string;
    name?: string;
    type?: ETokenType;

    loc?: ITokenLocation;
    range?: number[];
}

export interface IRule {
    left: string;
    right: string[];
    index: number;
}

export type IFinishFunc = (eCode: EParserCode, sFileName: string) => void;

export enum EOperationType {
    k_Error = 100,
    k_Shift,
    k_Reduce,
    k_Success,
    k_Pause,
    k_Ok
}

export type IRuleFunction = () => EOperationType;

export interface IParseNode {
    children: IParseNode[];
    parent: IParseNode;
    name: string;
    value: string;
    loc?: ITokenLocation;
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
}

export interface IParserState {
    source: string;
    index: number;
    fileName: string;
    tree: IParseTree;
    types: IMap<boolean>;
    stack: number[];
    token: IToken;
    fnCallback: IFinishFunc;
    caller: any;
    includeFiles?: IMap<boolean>;
}

export interface IParser {

    isTypeId(sValue: string): boolean;

    returnCode(pNode: IParseNode): string;

    init(sGrammar: string, eMode?: EParseMode, eType?: EParserType): boolean;
    defaultInit(): void;

    parse(sSource: string, fnFinishCallback?: IFinishFunc, pCaller?: {}): EParserCode;

    setParseFileName(sFileName: string): void;
    getParseFileName(): string;

    pause(): EParserCode;
    resume(): EParserCode;

    getSyntaxTree(): IParseTree;

    printStates(isPrintOnlyBase?: boolean): void;
    printState(iStateIndex: number, isPrintOnlyBase?: boolean): void;

    getGrammarSymbols(): IMap<string>;

    _saveState(): IParserState;
    _loadState(pState: IParserState): void;

    // _getLexer(): ILexer;
    // _getSource(): string;
    // _getIndex(): number;
    // _getTypeMap(): BoolMap;
    // _getStack(): number[];
    // _getToken(): IToken;
    // _getCallback(): IFinishFunc;
    // _getCaller(): any;

    // _setParserState(sSource: string,
    //                 iIndex: number,
    //                 sFileName: string,
    //                 pTree: IParseTree,
    //                 pTypes: BoolMap,
    //                 pStack: number[],
    //                 pToken: IToken,
    //                 fnCallback: IFinishFunc,
    //                 pCaller: any): void;
}
