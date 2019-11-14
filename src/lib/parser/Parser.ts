import bf from "@lib/bf";
import { deepEqual, isDef, isDefAndNotNull, isNull, verbose } from "@lib/common";
import { IDMap, IMap } from "@lib/idl/IMap";
import { IFile, IParserParams, IPosition, IRange } from "@lib/idl/parser/IParser";
import { DiagnosticException, Diagnostics, IDiagnosticReport } from "@lib/util/Diagnostics";
import { StringRef } from "@lib/util/StringRef";

import { ENodeCreateMode, EOperationType, EParseMode, EParserCode, EParserType, IParseNode, IParser, IParserState, IParseTree, IRule, IRuleFunction, IToken } from "../idl/parser/IParser";
import { Item } from "./Item";
import { Lexer } from "./Lexer";
import { ParseTree } from "./ParseTree";
import { State } from "./State";
import { END_POSITION, END_SYMBOL, FLAG_RULE_CREATE_NODE, FLAG_RULE_FUNCTION, FLAG_RULE_NOT_CREATE_NODE, INLINE_COMMENT_SYMBOL, LEXER_RULES, START_SYMBOL, T_EMPTY, UNUSED_SYMBOL } from "./symbols";

export enum EParserErrors {
    GrammarAddOperation = 2001,
    GrammarAddStateLink,
    GrammarUnexpectedSymbol,
    GrammarInvalidAdditionalFuncName,
    GrammarInvalidKeyword,
    SyntaxUnknownError = 2051,
    SyntaxUnexpectedEOF,

    GeneralCouldNotReadFile = 2200
};


export class ParserDiagnostics extends Diagnostics<IMap<any>> {
    constructor() {
        super("Parser Diagnostics", 'P');
    }


    protected resolveFilename(code: number, desc: IMap<any>): string {
        return desc.file;
    }


    protected resolveRange(code: number, desc: IMap<any>): IRange {
        switch (code) {
            case EParserErrors.SyntaxUnknownError:
            case EParserErrors.SyntaxUnexpectedEOF:
                return desc.token.loc;
        }
        return null;
    }


    protected resolvePosition(code: number, desc: IMap<any>): IPosition {
        console.assert(code != EParserErrors.SyntaxUnknownError);
        return { line: desc.line, column: 0, file: null };
    }


    protected diagnosticMessages() {
        return {
            [EParserErrors.GrammarAddOperation]: "Grammar not LALR(1)! Cannot to generate syntax table. Add operation error.\n" +
                "Conflict in state with index: {stateIndex}. With grammar symbol: \"{grammarSymbol}\"\n" +
                "Old operation: {oldOperation}\n" +
                "New operation: {newOperation}\n" +
                "For more info init parser in debug-mode and see syntax table and list of states.",
            [EParserErrors.GrammarAddStateLink]: "Grammar not LALR(1)! Cannot to generate syntax table. Add state link error.\n" +
                "Conflict in state with index: {stateIndex}. With grammar symbol: \"{grammarSymbol}\"\n" +
                "Old next state: {oldNextStateIndex}\n" +
                "New next state: {newNextStateIndex}\n" +
                "For more info init parser in debug-mode and see syntax table and list of states.",
            [EParserErrors.GrammarUnexpectedSymbol]: "Grammar error. Can`t generate rules from grammar\n" +
                "Unexpected symbol: {unexpectedSymbol}\n" +
                "Expected: {expectedSymbol}",
            [EParserErrors.GrammarInvalidAdditionalFuncName]: "Grammar error. Empty additional function name.",
            [EParserErrors.GrammarInvalidKeyword]: "Grammar error. Bad keyword: {badKeyword}\n" +
                "All keyword must be define in lexer rule block.",
            [EParserErrors.SyntaxUnknownError]: "Syntax error during parsing. Token: '{token.value}'\n" +
                "Line: {token.loc.start.line}. Column: {token.loc.start.column}.",
            [EParserErrors.SyntaxUnexpectedEOF]: "Syntax error. Unexpected EOF.",
            [EParserErrors.GeneralCouldNotReadFile]: "Could not read file '{target}'."
        };
    }
}

interface IOperation {
    type: EOperationType;
    rule?: IRule;
    index?: number;
}

interface IOperationMap {
    [grammarSymbol: string]: IOperation;
    [stateIndex: number]: IOperation;
}

interface IOperationDMap {
    [stateIndex: number]: IOperationMap;
}

interface IRuleMap {
    [ruleIndex: number]: IRule;
    [ruleName: string]: IRule;
}

interface IRuleDMap {
    [ruleIndex: number]: IRuleMap;
    [ruleName: string]: IRuleMap;
}

interface IRuleFunctionMap {
    [grammarSymbolOrFuncName: string]: IRuleFunction;
}

interface IRuleFunctionDMap {
    [stateIndex: number]: IRuleFunctionMap;
}

interface IAdditionalFuncInfo {
    name: string;
    position: number;
    rule: IRule;
}

export class Parser implements IParser {
    //Input

    private _source: string;
    private _filename: IFile;

    //Output

    private _syntaxTree: IParseTree | null;
    private _typeIdMap: IMap<boolean> | null;

    //Process params

    private _lexer: Lexer | null;
    private _stack: number[];
    private _token: IToken | null;


    //Grammar Info

    /** 
     * @deprecated 
     * Auxiliary map for all symbols from grammar: symbolName => bool.
     */
    private _syntaxTable: IOperationDMap | null;
    private _reduceOperationsMap: IOperationMap | null;
    private _shiftOperationsMap: IOperationMap | null;
    private _successOperation: IOperation | null;

    private _firstTerminalsDMap: IDMap<boolean> | null;
    private _followTerminalsDMap: IDMap<boolean> | null;

    /**
     * General structure:
     *  { [symbol name]: { [rule index]: IRule } }
     */
    private _rulesDMap: IRuleDMap | null;
    private _stateList: State[] | null;
    private _nRules: number;

    private _additionalFuncInfoList: IAdditionalFuncInfo[] | null;
    private _additionalFunctionsMap: IRuleFunctionMap | null;

    private _adidtionalFunctByStateDMap: IRuleFunctionDMap | null;

    /** 
     * LR0/LR1/LALR 
     */
    private _eType: EParserType;

    /** 
     * Auxiliary map for all symbols from grammar: symbolName => symbolName.
     */
    private _grammarSymbols: Map<string, string>;

    // Additioanal info

    private _ruleCreationModeMap: IMap<number> | null;
    private _parseMode: EParseMode;

    // Temp

    private _statesTempMap: IMap<State> | null;
    private _baseItemList: Item[] | null;
    /**
     * Auxiliary map: [item index] => { [item index]: true }
     */
    private _expectedExtensionDMap: IDMap<boolean> | null;

    private _diag: ParserDiagnostics;

    constructor() {
        this._source = "";
        // this._iIndex = 0;

        this._syntaxTree = null;
        this._typeIdMap = null;

        this._lexer = null;
        this._stack = <number[]>[];
        this._token = null;

        this._syntaxTable = null;
        this._reduceOperationsMap = null;
        this._shiftOperationsMap = null;
        this._successOperation = null;

        this._firstTerminalsDMap = null;
        this._followTerminalsDMap = null;
        this._rulesDMap = null;
        this._stateList = null;
        this._nRules = 0;
        this._additionalFuncInfoList = null;
        this._additionalFunctionsMap = null;
        this._adidtionalFunctByStateDMap = null;

        this._eType = EParserType.k_LR0;

        this._ruleCreationModeMap = null;
        this._parseMode = EParseMode.k_AllNode;

        // this._isSync = false;

        this._statesTempMap = null;
        this._baseItemList = null;

        this._expectedExtensionDMap = null;

        this._filename = StringRef.make("stdin");
        this._diag = new ParserDiagnostics;
    }


    isTypeId(sValue: string): boolean {
        return !!(this._typeIdMap[sValue]);
    }

    returnCode(node: IParseNode): string {
        if (node) {
            if (node.value) {
                return node.value + " ";
            } else if (node.children) {
                var sCode: string = "";
                var i: number = 0;
                for (i = node.children.length - 1; i >= 0; i--) {
                    sCode += this.returnCode(node.children[i]);
                }
                return sCode;
            }
        }
        return "";
    }

    init(grammar: string, mode: EParseMode = EParseMode.k_AllNode, type: EParserType = EParserType.k_LALR): boolean {
        try {
            this._eType = type;
            // todo: remove this callbacks in favor of direct parameters
            this._lexer = new Lexer({
                onResolveFilename: () => this.getParseFileName(),
                onResolveTypeId: (val: string) => this.isTypeId(val)
            });

            this._parseMode = mode;
            this.generateRules(grammar);
            this.buildSyntaxTable();
            this.generateFunctionByStateMap();
            if (!bf.testAll(mode, EParseMode.k_DebugMode)) {
                this.clearMem();
            }
        } catch (e) {
            if (e instanceof DiagnosticException) {
                // verbose(e.message);
                verbose(e.stack);
                return false;
            }
            throw e;
        }

        return true;
    }


    async parse(source: string): Promise<EParserCode> {
        try {
            this.defaultInit();
            this._source = source;
            this._lexer.init(source);

            let tree = this._syntaxTree;
            let stack = this._stack;
            let syntaxTable = this._syntaxTable;

            let breakProcessing = false;
            let errorFound = false;
            let token = this.readToken();
            let stateIndex = 0;

            let operation: IOperation;
            let ruleLength: number;
            let additionalOperationCode: EOperationType;

            while (!breakProcessing) {
                operation = syntaxTable[stack[stack.length - 1]][token.name];
                if (isDef(operation)) {
                    switch (operation.type) {
                        case EOperationType.k_Success:
                            breakProcessing = true;
                            break;

                        case EOperationType.k_Shift:

                            stateIndex = operation.index;
                            stack.push(stateIndex);
                            tree.addToken(token);

                            additionalOperationCode = await this.operationAdditionalAction(stateIndex, token.name);

                            if (additionalOperationCode === EOperationType.k_Error) {
                                errorFound = true;
                                breakProcessing = true;
                            } else if (additionalOperationCode === EOperationType.k_Ok) {
                                token = this.readToken();
                            }
                            break;

                        case EOperationType.k_Reduce:

                            ruleLength = operation.rule.right.length;
                            stack.length -= ruleLength;
                            stateIndex = syntaxTable[stack[stack.length - 1]][operation.rule.left].index;
                            stack.push(stateIndex);
                            tree.reduceByRule(operation.rule, this._ruleCreationModeMap[operation.rule.left]);

                            additionalOperationCode = await this.operationAdditionalAction(stateIndex, operation.rule.left);

                            if (additionalOperationCode === EOperationType.k_Error) {
                                errorFound = true;
                                breakProcessing = true;
                            }

                            break;
                    }
                } else {
                    errorFound = true;
                    breakProcessing = true;
                }
            }

            tree.finishTree();

            if (errorFound) {
                if (token.value == END_SYMBOL) {
                    this.syntaxError(EParserErrors.SyntaxUnexpectedEOF, token);
                } else {
                    this.syntaxError(EParserErrors.SyntaxUnknownError, token);
                }
                return EParserCode.k_Error;
            };

        } catch (e) {
            if (e instanceof DiagnosticException) {
                return EParserCode.k_Error;
            }
            throw e;
        }

        return EParserCode.k_Ok
    }


    setParseFileName(filename: string): void {
        this._filename = StringRef.make(filename);
    }


    getParseFileName(): IFile {
        return this._filename;
    }


    printStates(isBaseOnly: boolean = true): void {
        if (!isDef(this._stateList)) {
            console.warn("It`s impossible to print states. You must init parser in debug-mode");
            return;
        }
        var mesg: string = "\n" + this.statesToString(isBaseOnly);
        console.log(mesg);
    }


    printState(stateIndex: number, isBaseOnly: boolean = true): void {
        if (!isDef(this._stateList)) {
            console.log("It`s impossible to print states. You must init parser in debug-mode");
            return;
        }

        var state: State = this._stateList[stateIndex];
        if (!isDef(state)) {
            console.log("Can not print stete with index: " + stateIndex.toString());
            return;
        }

        var mesg: string = "\n" + state.toString(isBaseOnly);
        console.log(mesg);
    }


    getGrammarSymbols(): Map<string, string> {
        return this._grammarSymbols;
    }


    getSyntaxTree(): IParseTree | null {
        return this._syntaxTree;
    }


    protected saveState(): IParserState {
        return <IParserState>{
            source: this._source,
            index: this._lexer.getIndex(),
            fileName: this._filename,
            tree: this._syntaxTree,
            types: this._typeIdMap,
            stack: this._stack,
            token: this._token
        };
    }


    protected loadState(state: IParserState): void {
        this._source = state.source;
        // this._iIndex = state.index;
        this._filename = state.fileName;
        this._syntaxTree = state.tree;
        this._typeIdMap = state.types;
        this._stack = state.stack;
        this._token = state.token;

        this._lexer.setSource(state.source);
        this._lexer.setIndex(state.index);
    }


    addAdditionalFunction(sFuncName: string, fnRuleFunction: IRuleFunction): void {
        if (isNull(this._additionalFunctionsMap)) {
            this._additionalFunctionsMap = <IRuleFunctionMap>{};
        }
        this._additionalFunctionsMap[sFuncName] = fnRuleFunction;
    }


    addTypeId(sIdentifier: string): void {
        if (isNull(this._typeIdMap)) {
            this._typeIdMap = <IMap<boolean>>{};
        }
        this._typeIdMap[sIdentifier] = true;
    }


    protected defaultInit(): void {
        this._stack = [0];
        this._syntaxTree = new ParseTree();
        this._typeIdMap = <IMap<boolean>>{};

        this._syntaxTree.setOptimizeMode(bf.testAll(this._parseMode, EParseMode.k_Optimize));
        this._diag.reset();
    }


    private syntaxError(code: number, token: IToken) {
        this.critical(code, { file: this.getParseFileName(), token });
    }


    private grammarError(code: number, desc) {
        let file = "grammar";

        switch (code) {
            case EParserErrors.GrammarAddOperation:
                {
                    const { stateIndex, grammarSymbol, oldOperation, newOperation } = desc;
                    this.critical(code, {
                        file, line: 0, stateIndex, grammarSymbol,
                        oldOperation: Parser.operationToString(oldOperation),
                        newOperation: Parser.operationToString(newOperation)
                    });
                }
                break;
            case EParserErrors.GrammarAddStateLink:
                {
                    const { stateIndex, grammarSymbol, oldNextStateIndex, newNextStateIndex } = desc;
                    this.critical(code, { file, line: 0, stateIndex, grammarSymbol, oldNextStateIndex, newNextStateIndex });
                }
                break;
            case EParserErrors.GrammarUnexpectedSymbol:
                {
                    const { grammarLine, expectedSymbol, unexpectedSymbol } = desc;
                    this.critical(code, { file, line: grammarLine, expectedSymbol, unexpectedSymbol });
                }
                break;
            case EParserErrors.GrammarInvalidAdditionalFuncName:
                {
                    const { grammarLine } = desc;
                    this.critical(code, { file, line: grammarLine });
                }
                break;
            case EParserErrors.GrammarInvalidKeyword:
                {
                    const { grammarLine, badKeyword } = desc;
                    this.critical(code, { file, line: grammarLine, badKeyword })
                }
                break;
            default:
                throw "invalid case!!!!";
        }
    }


    private clearMem(): void {
        delete this._firstTerminalsDMap;
        delete this._followTerminalsDMap;
        delete this._rulesDMap;
        delete this._stateList;
        delete this._reduceOperationsMap;
        delete this._shiftOperationsMap;
        delete this._successOperation;
        delete this._statesTempMap;
        delete this._baseItemList;
        delete this._expectedExtensionDMap;
    }


    /**
     * Check for the state's dublicate.
     */
    private hasState(state: State, eType: EParserType): State {
        let stateList = this._stateList;

        for (let i = 0; i < stateList.length; i++) {
            if (stateList[i].isEqual(state, eType)) {
                return stateList[i];
            }
        }

        return null;
    }


    private nonTerminals(): string[] {
        return Object.keys(this._rulesDMap);
    }

    /**
     * terminals & non-terminals;
     */
    private symbols(): string[] {
        return [ ...this._grammarSymbols.keys() ];
    }

    private isTerminal(symbolVal: string): boolean {
        return !(this._rulesDMap[symbolVal]);
    }


    /** 
     * Add item to 'stateList' and set item's index in it. 
     */
    private pushState(state: State): void {
        state.setIndex(this._stateList.length);
        this._stateList.push(state);
    }


    /** 
     * Add item to 'baseItemList' and set item's index in it. 
     */
    private pushBaseItem(item: Item): void {
        item.setIndex(this._baseItemList.length);
        this._baseItemList.push(item);
    }


    private tryAddState(state: State, eType: EParserType): State {
        let res = this.hasState(state, eType);

        if (isNull(res)) {
            if (eType === EParserType.k_LR0) {
                let items = state.getItems();
                for (let i = 0; i < items.length; i++) {
                    this.pushBaseItem(items[i]);
                }
            }

            this.pushState(state);
            this.closure(state, eType);

            return state;
        }

        return res;
    }


    private hasEmptyRule(symbolVal: string): boolean {
        if (this.isTerminal(symbolVal)) {
            return false;
        }

        var pRulesDMap: IRuleDMap = this._rulesDMap;
        for (var i in pRulesDMap[symbolVal]) {
            if (pRulesDMap[symbolVal][i].right.length === 0) {
                return true;
            }
        }

        return false;
    }


    private pushInSyntaxTable(idx: number, symbolVal: string, operation: IOperation): void {
        var syntaxTable: IOperationDMap = this._syntaxTable;
        if (!syntaxTable[idx]) {
            syntaxTable[idx] = <IOperationMap>{};
        }
        if (isDef(syntaxTable[idx][symbolVal])) {
            this.grammarError(EParserErrors.GrammarAddOperation, {
                stateIndex: idx,
                grammarSymbol: this.convertGrammarSymbol(symbolVal),
                oldOperation: this._syntaxTable[idx][symbolVal],
                newOperation: operation
            });
        }
        syntaxTable[idx][symbolVal] = operation;
    }


    private addStateLink(state: State, nextState: State, symbolVal: string): void {
        let isAddState = state.addNextState(symbolVal, nextState);
        if (!isAddState) {
            this.grammarError(EParserErrors.GrammarAddStateLink, {
                stateIndex: state.getIndex(),
                oldNextStateIndex: state.getNextStateBySymbol(symbolVal),
                newNextStateIndex: nextState.getIndex(),
                grammarSymbol: this.convertGrammarSymbol(symbolVal)
            });
        }
    }


    private firstTerminal(symbolVal: string): IMap<boolean> {
        if (this.isTerminal(symbolVal)) {
            return null;
        }

        if (isDef(this._firstTerminalsDMap[symbolVal])) {
            return this._firstTerminalsDMap[symbolVal];
        }

        var ruleVal: string, sName: string;
        var names: string[];
        var i: number = 0, j: number = 0, k: number = 0;
        var rulesMap: IRuleMap = this._rulesDMap[symbolVal];

        var pTempRes: IMap<boolean> = <IMap<boolean>>{};
        var res: IMap<boolean>;

        var right: string[];
        var isFinish: boolean;

        res = this._firstTerminalsDMap[symbolVal] = <IMap<boolean>>{};

        if (this.hasEmptyRule(symbolVal)) {
            res[T_EMPTY] = true;
        }

        if (isNull(rulesMap)) {
            return res;
        }

        var pRuleNames: string[] = Object.keys(rulesMap);

        for (i = 0; i < pRuleNames.length; ++i) {
            ruleVal = pRuleNames[i];

            isFinish = false;
            right = rulesMap[ruleVal].right;

            for (j = 0; j < right.length; j++) {
                if (right[j] === symbolVal) {
                    if (res[T_EMPTY]) {
                        continue;
                    }

                    isFinish = true;
                    break;
                }

                pTempRes = this.firstTerminal(right[j]);

                if (isNull(pTempRes)) {
                    res[right[j]] = true;
                }
                else {
                    for (names = Object.keys(pTempRes), k = 0; k < names.length; ++k) {
                        sName = names[k];
                        res[sName] = true;
                    }
                }

                if (!this.hasEmptyRule(right[j])) {
                    isFinish = true;
                    break;
                }
            }

            if (!isFinish) {
                res[T_EMPTY] = true;
            }
        }

        return res;
    }

    // private followTerminal(symbolVal: string): IMap<boolean> {
    //     if (isDef(this._followTerminalsDMap[symbolVal])) {
    //         return this._followTerminalsDMap[symbolVal];
    //     }

    //     var i: number = 0, j: number = 0, k: number = 0, l: number = 0, m: number = 0;
    //     var pRulesDMap: IRuleDMap = this._rulesDMap;
    //     var rulesDMapKeys: string[], pRulesMapKeys: string[];

    //     var rule: IRule;
    //     var pTempRes: IMap<boolean>;
    //     var pTempKeys: string[];
    //     var res: IMap<boolean>;

    //     var right: string[];
    //     var isFinish: boolean;

    //     var sFirstKey: string;
    //     var sSecondKey: string;

    //     res = this._followTerminalsDMap[symbolVal] = <IMap<boolean>>{};

    //     if (isNull(pRulesDMap)) {
    //         return res;
    //     }

    //     rulesDMapKeys = Object.keys(pRulesDMap);
    //     for (i = 0; i < rulesDMapKeys.length; i++) {
    //         sFirstKey = rulesDMapKeys[i];

    //         if (isNull(pRulesDMap[sFirstKey])) {
    //             continue;
    //         }

    //         pRulesMapKeys = Object.keys(pRulesDMap[sFirstKey]);

    //         for (j = 0; j < pRulesMapKeys.length; j++) {
    //             rule = pRulesDMap[sFirstKey][sSecondKey];
    //             right = rule.right;

    //             for (k = 0; k < right.length; k++) {
    //                 if (right[k] === symbolVal) {
    //                     if (k === right.length - 1) {
    //                         pTempRes = this.followTerminal(rule.left);

    //                         pTempKeys = Object.keys(pTempRes);
    //                         for (m = 0; m < pTempKeys.length; i++) {
    //                             res[pTempKeys[m]] = true;
    //                         }
    //                     }
    //                     else {
    //                         isFinish = false;

    //                         for (l = k + 1; l < right.length; l++) {
    //                             pTempRes = this.firstTerminal(right[l]);

    //                             if (isNull(pTempRes)) {
    //                                 res[right[l]] = true;
    //                                 isFinish = true;
    //                                 break;
    //                             }
    //                             else {
    //                                 pTempKeys = Object.keys(pTempRes);
    //                                 for (m = 0; m < pTempKeys.length; i++) {
    //                                     res[pTempKeys[m]] = true;
    //                                 }
    //                             }

    //                             if (!pTempRes[T_EMPTY]) {
    //                                 isFinish = true;
    //                                 break;
    //                             }
    //                         }

    //                         if (!isFinish) {
    //                             pTempRes = this.followTerminal(rule.left);

    //                             pTempKeys = Object.keys(pTempRes);
    //                             for (m = 0; m < pTempKeys.length; i++) {
    //                                 res[pTempKeys[m]] = true;
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }

    //     return res;
    // }

    private firstTerminalForSet(pSet: string[], pExpected: IMap<boolean>): IMap<boolean> {
        var i: number = 0, j: number = 0;

        var pTempRes: IMap<boolean>;
        var res: IMap<boolean> = <IMap<boolean>>{};

        var isEmpty: boolean;

        var pKeys: string[];
        var sKey: string;

        for (i = 0; i < pSet.length; i++) {
            pTempRes = this.firstTerminal(pSet[i]);

            if (isNull(pTempRes)) {
                res[pSet[i]] = true;
                return res;
            }

            isEmpty = false;


            pKeys = Object.keys(pTempRes);

            for (j = 0; j < pKeys.length; j++) {
                sKey = pKeys[j];

                if (sKey === T_EMPTY) {
                    isEmpty = true;
                    continue;
                }
                res[sKey] = true;

            }

            if (!isEmpty) {
                return res;
            }
        }


        if (!isNull(pExpected)) {
            pKeys = Object.keys(pExpected);
            for (j = 0; j < pKeys.length; j++) {
                res[pKeys[j]] = true;
            }
        }

        return res;
    }


    private generateRules(grammarSource: string): void {
        let allRuleList: string[] = grammarSource.split(/\r?\n/);
        let tempRule: string[];
        let rule: IRule;
        let isLexerBlock = false;

        this._rulesDMap = <IRuleDMap>{};
        this._additionalFuncInfoList = <IAdditionalFuncInfo[]>[];
        this._ruleCreationModeMap = <IMap<number>>{};
        this._grammarSymbols = new Map([[ 'END_SYMBOL', END_SYMBOL ]]);

        let i = 0, j = 0;

        // append all nodes ignoring any flags 
        let isAllNodeMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_AllNode);
        // force skip node if it is marked as '--NN'
        let isNegateMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_Negate);
        // force add node if it is marked as '--AN'
        let isAddMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_Add);

        let symbolsWithNodeMap: IMap<number> = this._ruleCreationModeMap;

        let sName: string;

        for (i = 0; i < allRuleList.length; i++) {
            if (allRuleList[i] === "" || allRuleList[i] === "\r") {
                continue;
            }

            // split rule like 'S : Program'
            tempRule = allRuleList[i].trim().split(/\s* \s*/);

            // ignore rules starting with '#'
            if (tempRule[0][0] == INLINE_COMMENT_SYMBOL) {
                continue;
            }

            if (isLexerBlock) {
                if ((tempRule.length === 3 || (tempRule.length === 4 && tempRule[3] === "")) &&
                    ((tempRule[2][0] === "\"" || tempRule[2][0] === "'") && tempRule[2].length > 3)) {

                    //TERMINALS
                    if (tempRule[2][0] !== tempRule[2][tempRule[2].length - 1]) {
                        this.grammarError(EParserErrors.GrammarUnexpectedSymbol, {
                            unexpectedSymbol: tempRule[2][tempRule[2].length - 1],
                            expectedSymbol: tempRule[2][0],
                            grammarLine: i
                        });
                    }

                    tempRule[2] = tempRule[2].slice(1, tempRule[2].length - 1);

                    var ch: string = tempRule[2][0];


                    if ((ch === "_") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
                        sName = this._lexer.addKeyword(tempRule[2], tempRule[0]);
                    }
                    else {
                        sName = this._lexer.addPunctuator(tempRule[2], tempRule[0]);
                    }

                    this._grammarSymbols.set(sName, tempRule[2]);
                }

                continue;
            }

            // looking for '--LEXER--' keyword
            if (tempRule[0] === LEXER_RULES) {
                isLexerBlock = true;
                continue;
            }

            //NON TERMNINAL RULES
            if (!isDef(this._rulesDMap[tempRule[0]])) {
                this._rulesDMap[tempRule[0]] = <IRuleMap>{};
            }

            rule = {
                left: tempRule[0],
                right: <string[]>[],
                index: 0
            };

            this._grammarSymbols.set(tempRule[0], tempRule[0]);

            if (isAllNodeMode) {
                symbolsWithNodeMap[tempRule[0]] = ENodeCreateMode.k_Default;
            } else if (isNegateMode && !isDef(symbolsWithNodeMap[tempRule[0]])) {
                symbolsWithNodeMap[tempRule[0]] = ENodeCreateMode.k_Default;
            } else if (isAddMode && !isDef(symbolsWithNodeMap[tempRule[0]])) {
                symbolsWithNodeMap[tempRule[0]] = ENodeCreateMode.k_Not;
            }

            for (j = 2; j < tempRule.length; j++) {
                if (tempRule[j] === "") {
                    continue;
                }
                // handle flag '--AN'
                if (tempRule[j] === FLAG_RULE_CREATE_NODE) {
                    if (isAddMode) {
                        symbolsWithNodeMap[tempRule[0]] = ENodeCreateMode.k_Necessary;
                    }
                    continue;
                }
                // handle flag '--N'
                if (tempRule[j] === FLAG_RULE_NOT_CREATE_NODE) {
                    if (isNegateMode && !isAllNodeMode) {
                        symbolsWithNodeMap[tempRule[0]] = ENodeCreateMode.k_Not;
                    }
                    continue;
                }
                // looking for additional user functions like '--F includeCode'
                if (tempRule[j] === FLAG_RULE_FUNCTION) {
                    if ((!tempRule[j + 1] || tempRule[j + 1].length === 0)) {
                        this.grammarError(EParserErrors.GrammarInvalidAdditionalFuncName, { grammarLine: i });
                    }

                    let funcInfo = <IAdditionalFuncInfo>{
                        name: tempRule[j + 1],
                        position: rule.right.length,
                        rule: rule
                    };
                    this._additionalFuncInfoList.push(funcInfo);
                    j++;
                    continue;
                }
                // handle string literlas
                if (tempRule[j][0] === "'" || tempRule[j][0] === "\"") {
                    if (tempRule[j].length !== 3) {
                        this.grammarError(EParserErrors.GrammarInvalidKeyword, {
                            badKeyword: tempRule[j],
                            grammarLine: i
                        });
                    }
                    if (tempRule[j][0] !== tempRule[j][2]) {
                        this.grammarError(EParserErrors.GrammarUnexpectedSymbol, {
                            unexpectedSymbol: tempRule[j][2],
                            expectedSymbol: tempRule[j][0],
                            grammarLine: i
                        });
                    }

                    sName = this._lexer.addPunctuator(tempRule[j][1]);
                    rule.right.push(sName);
                    this._grammarSymbols.set(sName, tempRule[j][1]);
                }
                else {
                    rule.right.push(tempRule[j]);
                    this._grammarSymbols.set(tempRule[j], tempRule[j]);
                }
            }

            rule.index = this._nRules;
            this._rulesDMap[tempRule[0]][rule.index] = rule;
            this._nRules += 1;
        }
    }


    private generateFunctionByStateMap(): void {
        if (isNull(this._additionalFunctionsMap)) {
            return;
        }

        var stateList = this._stateList;
        var funcInfoList = this._additionalFuncInfoList;
        var funcInfo: IAdditionalFuncInfo;
        var rule: IRule;
        var pos = 0;
        var func: IRuleFunction;
        var grammarSymbol: string;

        var i: number = 0, j: number = 0;

        var funcByStateDMap = <IRuleFunctionDMap>{};
        funcByStateDMap = this._adidtionalFunctByStateDMap = <IRuleFunctionDMap>{};

        for (i = 0; i < funcInfoList.length; i++) {
            funcInfo = funcInfoList[i];

            func = this._additionalFunctionsMap[funcInfo.name];
            if (!isDef(func)) {
                continue;
            }

            rule = funcInfo.rule;
            pos = funcInfo.position;
            grammarSymbol = rule.right[pos - 1];

            for (j = 0; j < stateList.length; j++) {
                if (stateList[j].hasRule(rule, pos)) {

                    if (!isDef(funcByStateDMap[stateList[j].getIndex()])) {
                        funcByStateDMap[stateList[j].getIndex()] = <IRuleFunctionMap>{};
                    }

                    funcByStateDMap[stateList[j].getIndex()][grammarSymbol] = func;
                }
            }
        }
    }


    private generateFirstState_LR0(): void {
        let state = new State();
        let firstRule = this._rulesDMap[START_SYMBOL][0];
        let item = new Item(firstRule, 0);

        this.pushBaseItem(item);
        state.push(item);

        this.closure_LR0(state);
        this.pushState(state);
    }


    private generateFirstState_LR(): void {
        let state = new State();
        let firstRule = this._rulesDMap[START_SYMBOL][0];
        let pExpected = <IMap<boolean>>{ [END_SYMBOL]: true };

        state.push(new Item(firstRule, 0, pExpected));

        this.closure_LR(state);
        this.pushState(state);
    }


    private closure(state: State, eType: EParserType): State {
        if (eType === EParserType.k_LR0) {
            return this.closure_LR0(state);
        } else {
            return this.closure_LR(state);
        }
    }


    /**
     * Add all available non terminal rules (as items) to state.
     */
    private closure_LR0(state: State): State {
        let itemList = state.getItems();
        for (let i = 0; i < itemList.length; i++) {
            let symbolVal = itemList[i].mark();
            if (symbolVal !== END_POSITION && (!this.isTerminal(symbolVal))) {
                let keys = Object.keys(this._rulesDMap[symbolVal]);
                for (let j = 0; j < keys.length; j++) {
                    state.tryPush_LR0(this._rulesDMap[symbolVal][keys[j]], 0);
                }
            }
        }
        return state;
    }


    private closure_LR(state: State): State {
        let itemList = state.getItems();
        let i: number = 0, j: number = 0, k: number = 0;
        let isNewExpected = false;

        while (true) {
            if (i === itemList.length) {
                if (!isNewExpected) {
                    break;
                }
                i = 0;
                isNewExpected = false;
            }
            let symbolVal = itemList[i].mark();

            if (symbolVal !== END_POSITION && (!this.isTerminal(symbolVal))) {
                let tempSet = itemList[i].getRule().right.slice(itemList[i].getPosition() + 1);
                let symbols = this.firstTerminalForSet(tempSet, itemList[i].getExpectedSymbols());

                let ruleIndexList = Object.keys(this._rulesDMap[symbolVal]);
                let symbolsKeys = Object.keys(symbols);

                for (j = 0; j < ruleIndexList.length; j++) {
                    for (k = 0; k < symbolsKeys.length; k++) {
                        if (state.tryPush_LR(this._rulesDMap[symbolVal][ruleIndexList[j]], 0, symbolsKeys[k])) {
                            isNewExpected = true;
                        }
                    }
                }
            }

            i++;
        }

        return state;
    }


    private static nextState_LR0(state: State, symbolVal: string): State {
        const itemList = state.getItems();
        const nextState = new State();

        for (let i = 0; i < itemList.length; i++) {
            if (symbolVal === itemList[i].mark()) {
                nextState.push(new Item(itemList[i].getRule(), itemList[i].getPosition() + 1));
            }
        }

        return nextState;
    }


    private static nextState_LR(state: State, symbolVal: string): State {
        const itemList = state.getItems();
        const nextState = new State();

        for (let i = 0; i < itemList.length; i++) {
            if (symbolVal === itemList[i].mark()) {
                nextState.push(new Item(itemList[i].getRule(), itemList[i].getPosition() + 1, itemList[i].getExpectedSymbols()));
            }
        }

        return nextState;
    }


    private deleteNotBaseItems(): void {
        for (let i = 0; i < this._stateList.length; i++) {
            this._stateList[i].deleteNotBase();
        }
    }


    private closureForItem(rule: IRule, pos: number): State {
        let indexVal = "";
        indexVal += rule.index + "_" + pos;

        let state = this._statesTempMap[indexVal];
        if (isDef(state)) {
            return state;
        }
        
        let expected = <IMap<boolean>>{ [UNUSED_SYMBOL]: true };

        state = new State();
        state.push(new Item(rule, pos, expected));

        this.closure_LR(state);
        this._statesTempMap[indexVal] = state;

        return state;
    }


    private addLinkExpected(item: Item, pItemX: Item): void {
        let table = this._expectedExtensionDMap;
        let index = item.getIndex();

        if (!isDef(table[index])) {
            table[index] = {};
        }

        table[index][pItemX.getIndex()] = true;
    }


    private determineExpected(testState: State, symbolVal: string): void {
        let stateX = testState.getNextStateBySymbol(symbolVal);

        if (isNull(stateX)) {
            return;
        }

        let itemListX = stateX.getItems();
        let itemList = testState.getItems();
        let nBaseItemX = stateX.getNumBaseItems();
        let nBaseItemTest = testState.getNumBaseItems();

        for (let i = 0; i < nBaseItemTest; i++) {
            let state = this.closureForItem(itemList[i].getRule(), itemList[i].getPosition());

            for (let j = 0; j < nBaseItemX; j++) {
                let item = <Item>state.hasChildItem(itemListX[j]);

                if (item) {
                    let expected: IMap<boolean> = item.getExpectedSymbols();

                    for (let k in expected) {
                        if (k === UNUSED_SYMBOL) {
                            this.addLinkExpected(itemList[i], itemListX[j]);
                        }
                        else {
                            itemListX[j].addExpected(k);
                        }
                    }
                }
            }
        }
    }


    private generateLinksExpected(): void {
        const states = this._stateList;
        const symbols = this.symbols();

        for (let i = 0; i < states.length; i++) {
            for (let j = 0; j < symbols.length; j++) {
                this.determineExpected(states[i], symbols[j]);
            }
        }
    }


    /**
     * Set expected symbols from child to parent items. (????)
     */
    private expandExpected(): void {
        let itemList = this._baseItemList;
        let table = this._expectedExtensionDMap;
        let i = 0;
        let isNewExpected = false;

        itemList[0].addExpected(END_SYMBOL);
        itemList[0].setIsNewExpected(true);

        while (true) {
            if (i === itemList.length) {
                if (!isNewExpected) {
                    break;
                }
                isNewExpected = false;
                i = 0;
            }

            if (itemList[i].getIsNewExpected() && isDefAndNotNull(table[i])) {
                // known expected symbols for item 'i'
                let expectedSymbols = Object.keys(itemList[i].getExpectedSymbols());
                // indices of all expected items for item 'i'
                let keys = Object.keys(table[i]);

                for (let j = 0; j < expectedSymbols.length; j++) {
                    for (let k = 0; k < keys.length; k++) {
                        if (itemList[keys[k]].addExpected(expectedSymbols[j])) {
                            isNewExpected = true;
                        }
                    }
                }
            }

            itemList[i].setIsNewExpected(false);
            i++;
        }
    }


    private generateStates(eType: EParserType): void {
        if (eType === EParserType.k_LR0) {
            this.generateStates_LR0();
        }
        else if (eType === EParserType.k_LR1) {
            this.generateStates_LR();
        }
        else if (eType === EParserType.k_LALR) {
            this.generateStates_LALR();
        }
    }


    private generateStates_LR0(): void {
        this.generateFirstState_LR0();

        const stateList = this._stateList;
        const symbols = this.symbols();

        for (let i = 0; i < stateList.length; i++) {
            for (let j = 0; j < symbols.length; j++) {
                // state with rules which contain symbols[j]
                let state = Parser.nextState_LR0(stateList[i], symbols[j]);

                if (!state.isEmpty()) {
                    state = this.tryAddState(state, EParserType.k_LR0);
                    this.addStateLink(stateList[i], state, symbols[j]);
                }
            }
        }
    }


    private generateStates_LR(): void {
        this._firstTerminalsDMap = <IDMap<boolean>>{};
        this.generateFirstState_LR();

        const stateList = this._stateList;
        const symbols = this.symbols();

        for (let i = 0; i < stateList.length; i++) {
            for (let j = 0; j < symbols.length; j++) {
                let symbolVal = symbols[j];
                let state = Parser.nextState_LR(stateList[i], symbolVal);

                if (!state.isEmpty()) {
                    state = this.tryAddState(state, EParserType.k_LR1);
                    this.addStateLink(stateList[i], state, symbolVal);
                }
            }
        }
    }

    private generateStates_LALR(): void {
        this._statesTempMap = <IMap<State>>{};
        this._baseItemList = <Item[]>[];
        this._expectedExtensionDMap = <IDMap<boolean>>{};
        this._firstTerminalsDMap = <IDMap<boolean>>{};

        this.generateStates_LR0();
        this.deleteNotBaseItems();
        this.generateLinksExpected();
        this.expandExpected();

        const stateList = this._stateList;
        for (let i = 0; i < stateList.length; i++) {
            this.closure_LR(stateList[i]);
        }
    }


    private addReducing(state: State): void {
        let i: number = 0, j: number = 0;
        let itemList: Item[] = state.getItems();

        for (i = 0; i < itemList.length; i++) {
            if (itemList[i].mark() === END_POSITION) {
                if (itemList[i].getRule().left === START_SYMBOL) {
                    this.pushInSyntaxTable(state.getIndex(), END_SYMBOL, this._successOperation);
                }
                else {
                    let pExpected = itemList[i].getExpectedSymbols();

                    let pKeys: string[] = Object.keys(pExpected);
                    for (j = 0; j < pKeys.length; j++) {
                        this.pushInSyntaxTable(state.getIndex(), pKeys[j], this._reduceOperationsMap[itemList[i].getRule().index]);
                    }
                }
            }
        }
    }

    private addShift(state: State) {
        let i: number = 0;
        let pStateMap: IMap<State> = state.getNextStates();

        let pStateKeys: string[] = Object.keys(pStateMap);

        for (i = 0; i < pStateKeys.length; i++) {
            let symbolVal: string = pStateKeys[i];
            this.pushInSyntaxTable(state.getIndex(), symbolVal, this._shiftOperationsMap[pStateMap[symbolVal].getIndex()]);
        }
    }

    private buildSyntaxTable(): void {
        this._stateList = <State[]>[];

        let stateList: State[] = this._stateList;
        let state: State;

        // Generate states
        this.generateStates(this._eType);

        // Init necessary properties
        this._syntaxTable = <IOperationDMap>{};
        this._reduceOperationsMap = <IOperationMap>{};
        this._shiftOperationsMap = <IOperationMap>{};

        this._successOperation = <IOperation>{ type: EOperationType.k_Success };

        let i: number = 0, j: number = 0, k: number = 0;

        for (i = 0; i < stateList.length; i++) {
            this._shiftOperationsMap[stateList[i].getIndex()] = <IOperation>{
                type: EOperationType.k_Shift,
                index: stateList[i].getIndex()
            };
        }

        let rulesDMapKeys: string[] = Object.keys(this._rulesDMap);
        for (j = 0; j < rulesDMapKeys.length; j++) {
            let rulesMapKeys: string[] = Object.keys(this._rulesDMap[rulesDMapKeys[j]]);
            for (k = 0; k < rulesMapKeys.length; k++) {
                let symbolVal = rulesMapKeys[k];
                let rule = this._rulesDMap[rulesDMapKeys[j]][symbolVal];

                this._reduceOperationsMap[symbolVal] = <IOperation>{
                    type: EOperationType.k_Reduce,
                    rule: rule
                };
            }
        }

        //Build syntax table
        for (i = 0; i < stateList.length; i++) {
            state = stateList[i];
            this.addReducing(state);
            this.addShift(state);
        }
    }

    private readToken(): IToken {
        return this._lexer.getNextToken();
    }


    private async operationAdditionalAction(stateIndex: number, grammarSymbol: string): Promise<EOperationType> {
        let funcDMap: IRuleFunctionDMap = this._adidtionalFunctByStateDMap;

        if (!isNull(this._adidtionalFunctByStateDMap) &&
            isDef(funcDMap[stateIndex]) &&
            isDef(funcDMap[stateIndex][grammarSymbol])) {
            return await funcDMap[stateIndex][grammarSymbol]();
        }

        return EOperationType.k_Ok;
    }


    protected async resumeParse(): Promise<EParserCode> {
        let breakProcessing = false;
        let errorFound = false;
        let token = isNull(this._token) ? this.readToken() : this._token;
        let tree = this._syntaxTree;
        let stack = this._stack;
        let syntaxTable = this._syntaxTable;

        try {
            let operation: IOperation;
            let ruleLength: number;

            let additionalOperationCode: EOperationType;
            let stateIndex: number = 0;

            while (!breakProcessing) {
                operation = syntaxTable[stack[stack.length - 1]][token.name];
                if (isDef(operation)) {
                    switch (operation.type) {
                        case EOperationType.k_Success:
                            breakProcessing = true;
                            break;

                        case EOperationType.k_Shift:

                            stateIndex = operation.index;
                            stack.push(stateIndex);
                            tree.addToken(token);

                            additionalOperationCode = await this.operationAdditionalAction(stateIndex, token.name);

                            if (additionalOperationCode === EOperationType.k_Error) {
                                errorFound = true;
                                breakProcessing = true;
                            }
                            else if (additionalOperationCode === EOperationType.k_Ok) {
                                token = this.readToken();
                            }

                            break;

                        case EOperationType.k_Reduce:

                            ruleLength = operation.rule.right.length;
                            stack.length -= ruleLength;
                            stateIndex = syntaxTable[stack[stack.length - 1]][operation.rule.left].index;
                            stack.push(stateIndex);
                            tree.reduceByRule(operation.rule, this._ruleCreationModeMap[operation.rule.left]);

                            additionalOperationCode = await this.operationAdditionalAction(stateIndex, operation.rule.left);

                            if (additionalOperationCode === EOperationType.k_Error) {
                                errorFound = true;
                                breakProcessing = true;
                            }
                            break;
                        default:
                    }
                }
                else {
                    errorFound = true;
                    breakProcessing = true;
                }
            }

            tree.finishTree();

            if (errorFound) {
                this.syntaxError(EParserErrors.SyntaxUnknownError, token);
                return EParserCode.k_Error;
            }

        }
        catch (e) {
            if (e instanceof DiagnosticException) {
                return EParserCode.k_Error;
            }

            throw e;
        }

        return EParserCode.k_Ok;
    }


    private statesToString(isBaseOnly: boolean = true): string {
        if (!isDef(this._stateList)) {
            return "";
        }

        let mesg: string = "";
        let i: number = 0;

        for (i = 0; i < this._stateList.length; i++) {
            mesg += this._stateList[i].toString(isBaseOnly, this._grammarSymbols);
            mesg += " ";
        }

        return mesg;
    }


    private static operationToString(operation: IOperation): string {
        let opVal: string = "";

        switch (operation.type) {
            case EOperationType.k_Shift:
                opVal = "SHIFT to state " + operation.index.toString();
                break;
            case EOperationType.k_Reduce:
                opVal = "REDUCE by rule { " + Parser.ruleToString(operation.rule) + " }";
                break;
            case EOperationType.k_Success:
                opVal = "SUCCESS";
                break;
        }

        return opVal;
    }


    private static ruleToString(rule: IRule): string {
        let ruleVal: string;

        ruleVal = rule.left + " : " + rule.right.join(" ");

        return ruleVal;
    }


    private convertGrammarSymbol(symbolVal: string): string {
        if (!this.isTerminal(symbolVal)) {
            return symbolVal;
        } else {
            return this._lexer.getTerminalValueByName(symbolVal);
        }
    }


    getDiagnostics(): IDiagnosticReport {
        let parserReport = this._diag.resolve();
        let lexerReport = this._lexer.getDiagnostics();
        return Diagnostics.mergeReports([lexerReport, parserReport]);
    }

    protected critical(code, desc) {
        this._diag.critical(code, desc);
    }


    private static $parser: IParser = null;
    private static $parserParams: IParserParams = null;

    /**
     * Create a singleton instance of parser for internal use.
     */
    static init(parserParams: IParserParams, ParserConstructor: new () => IParser = null): IParser {
        const { grammar, mode, type } = parserParams;

        if (!grammar) {
            return Parser.$parser;
        }

        if (deepEqual(parserParams, Parser.$parserParams)) {
            return Parser.$parser;
        }

        if (isNull(ParserConstructor)) {
            ParserConstructor = Parser;
        }

        console.log('%c Creating parser....', 'background: #222; color: #bada55');
        Parser.$parserParams = parserParams;
        Parser.$parser = new ParserConstructor();

        if (!Parser.$parser.init(grammar, mode, type)) {
            console.error('Could not initialize parser!');
            Parser.$parser = null;
        } else {
            console.log('%c [ DONE ]', 'background: #222; color: #bada55');
        }

        return Parser.$parser;
    }


    static async parse(content: string, filename: string = "stdin")
    {
        Parser.$parser.setParseFileName(filename);
        // All diagnostic exceptions should be already handled inside parser.
        let result = await Parser.$parser.parse(content);
    
        let diag = Parser.$parser.getDiagnostics();
        let ast = Parser.$parser.getSyntaxTree();

        // todo: fix this hack
        Parser.$parser.setParseFileName("stdin");

        return { result, diag, ast };
    }
}
