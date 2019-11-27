import bf from "@lib/bf";
import { assert, deepEqual, isDef, isDefAndNotNull, isNull, verbose } from "@lib/common";
import { IDMap, IMap } from "@lib/idl/IMap";
import { ExpectedSymbols, IFile, IParserParams, IPosition, IRange } from "@lib/idl/parser/IParser";
import { ENodeCreateMode, EOperationType, EParseMode, EParserCode, EParserType, IParseNode, IParser, IParserState, IParseTree, IRule, IRuleFunction, IToken } from "@lib/idl/parser/IParser";
import { DiagnosticException, Diagnostics, IDiagnosticReport } from "@lib/util/Diagnostics";
import { StringRef } from "@lib/util/StringRef";

import { Item } from "./Item";
import { Lexer } from "./Lexer";
import { extendLocation, ParseTree } from "./ParseTree";
import { State } from "./State";
import { END_POSITION, END_SYMBOL, ERROR, FLAG_RULE_CREATE_NODE, FLAG_RULE_FUNCTION, FLAG_RULE_NOT_CREATE_NODE, INLINE_COMMENT_SYMBOL, LEXER_RULES, START_SYMBOL, T_EMPTY, UNKNOWN_TOKEN, UNUSED_SYMBOL } from "./symbols";

export enum EParserErrors {
    GrammarAddOperation = 2001,
    GrammarAddStateLink,
    GrammarUnexpectedSymbol,
    GrammarInvalidAdditionalFuncName,
    GrammarInvalidKeyword,
    SyntaxUnknownError = 2051,
    SyntaxUnexpectedEOF,
    SyntaxRecoverableStateNotFound,

    GeneralCouldNotReadFile = 2200,
    GeneralParsingLimitIsReached
};

// const isPunctuator = (s: string) => s.match(/^T_PUNCTUATOR_(\d+)$/) !== null;
// const punctuatorValue = (s: string) => isPunctuator(s) ? `'${String.fromCharCode(Number(s.match(/^T_PUNCTUATOR_(\d+)$/)[1]))}'` : s;


type Terminals = Set<string>;


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
                "For more info init parser in debug-mode and see syntax table and list of states." +
                `\n\n{stateDesc}`,
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
            [EParserErrors.GeneralCouldNotReadFile]: "Could not read file '{target}'.",
            [EParserErrors.GeneralParsingLimitIsReached]: "Parsing limit is reached.",
            [EParserErrors.SyntaxRecoverableStateNotFound]: "Recoverable state not found."
        };
    }
}

interface IOperation {
    type: EOperationType;
    rule?: IRule;
    stateIndex?: number;
}

interface IOperationMap {
    [grammarSymbol: string]: IOperation;
    [stateIndex: number]: IOperation;
}

interface ISyntaxTable {
    [stateIndex: number]: {
        [terminal: string]: IOperation;
    }
}

interface IRuleMap {
    [ruleIndex: number]: IRule;
}

interface IProductions {
    [nonTerminal: string]: IRuleMap;
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

    private _diag: ParserDiagnostics;
    private _syntaxTree: IParseTree;
    private _typeIdMap: IMap<boolean>;

    //Process params

    private _lexer: Lexer;
    private _stack: number[];
    private _token: IToken;

    //
    // Grammar based Info
    //

    private _syntaxTable: ISyntaxTable;


    // LR0/LR1/LALR
    private _type: EParserType;
    // global flag
    private _parseMode: EParseMode;

    /**
     * General structure:
     *  { [symbol name]: { [rule index]: IRule } }
     */
    private _productions: IProductions;
    private _states: State[];
    private _baseItems: Item[];
    /**
 * Auxiliary map for all symbols from grammar: symbolName => symbolName.
 * For ex.: T_PUNCTUATOR_61 => '='
 */
    private _grammarSymbols: Map<string, string>;

    // functions described in grammar's flags
    private _additionalFuncInfoList: IAdditionalFuncInfo[];
    private _additionalFunctionsMap: IRuleFunctionMap;
    private _adidtionalFunctByStateDMap: IRuleFunctionDMap;

    // Additioanal info

    // flags for rules (extracted from grammar's flags)
    private _ruleCreationModeMap: IMap<number>;

    // Temp

    private _closureForItemsCache: IMap<State>;
    // aux. cache for first terminals
    private _firstTerminalsCache: IMap<Terminals>;
    // private _followTerminalsCache: IDMap<boolean>;

    /**
     * Auxiliary map: [item index] => { [item index]: true }
     * Expectation correspondence map.
     */
    // NOTE: default JS object significantly faster than Map<number, Set<number>>
    //       for this case :/
    private _expectedExtensionDMap: IDMap<boolean>;


    constructor() {
        this._source = "";

        this._syntaxTree = null;
        this._typeIdMap = null;

        this._lexer = null;
        this._stack = <number[]>[];
        this._token = null;

        this._syntaxTable = null;

        this._productions = null;
        this._baseItems = null;
        this._states = null;

        this._additionalFuncInfoList = null;
        this._additionalFunctionsMap = null;
        this._adidtionalFunctByStateDMap = null;

        this._type = EParserType.k_LR0;

        this._ruleCreationModeMap = null;
        this._parseMode = EParseMode.k_AllNode;

        this._firstTerminalsCache = null;
        // this._followTerminalsCache = null;
        this._closureForItemsCache = null;

        this._expectedExtensionDMap = null;

        this._filename = StringRef.make("stdin");
        this._diag = new ParserDiagnostics;
    }


    isTypeId(sValue: string): boolean {
        return !!(this._typeIdMap[sValue]);
    }


    init(grammar: string, mode: EParseMode = EParseMode.k_AllNode, type: EParserType = EParserType.k_LALR): boolean {
        try {
            this._type = type;
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

    private restoreState(syntaxTable: ISyntaxTable, parseTree: ParseTree, stack: number[], causingErrorToken: IToken, errorToken: IToken) {
        while (true) {
            let recoverableState = -1;
            for (let i = stack.length - 1; i >= 0; --i) {
                const errorOp = syntaxTable[stack[i]][ERROR];
                const isRecoverableState = (isDef(errorOp) &&
                    errorOp.type === EOperationType.k_Shift &&
                    syntaxTable[errorOp.stateIndex][causingErrorToken.name]);
                if (isRecoverableState) {
                    recoverableState = i;
                    break;
                }
            }


            if (recoverableState !== -1) {
                const recoveredStateIndex = stack[recoverableState];
                // current op will be: syntaxTable[recoveredStateIndex][ERROR];

                let stackDiff = stack.length - 1 - recoverableState;
                while (stackDiff != 0) {
                    // extend error token location with the already processed tokens
                    parseTree.$pop(errorToken.loc);
                    stack.pop();
                    stackDiff--;
                }

                // recoverable state found so continue normal processing as it would be before the error
                return recoveredStateIndex;
            }

            extendLocation(errorToken.loc, causingErrorToken.loc);

            if (causingErrorToken.value === END_SYMBOL) {
                // state cant be recovered
                break;
            }

            // try to restore from the next token
            // FIXME: 
            const nextToken = this.readToken();
            Object.keys(nextToken).forEach(key => causingErrorToken[key] = nextToken[key]);
        }
        return -1;
    }


    static cloneToken(token: IToken): IToken {
        return {
            ...token,
            loc: {
                start: { ...token.loc.start },
                end: { ...token.loc.end }
            }
        };
    }

    private async run(
        syntaxTable: ISyntaxTable,
        stack: number[],
        token: IToken,
        parseTree: IParseTree,
        { debugMode = false, allowErrorRecoverty = true }): Promise<void> {

        const undefinedToken: IToken =  { index: -1, name: null, value: null };
        let causingErrorToken: IToken = undefinedToken;

        // debug mode
        const opLimit = 10000;
        let opCounter = 0;

        try {
            breakProcessing:
            while (true) {
                // global recursion prevention in debug mode
                if (debugMode) {
                    if (opCounter > opLimit) {
                        this.emitCritical(EParserErrors.GeneralParsingLimitIsReached);
                    }
                    opCounter++;
                }

                let currStateIndex = stack[stack.length - 1];
                let op = syntaxTable[currStateIndex][token.name];

                if (allowErrorRecoverty) {
                    if (!op) {
                        // recursion prevention
                        if (causingErrorToken.index !== token.index) {
                            if (token.value === END_SYMBOL) {
                                this.emitError(EParserErrors.SyntaxUnexpectedEOF, token);
                            } else {
                                this.emitError(EParserErrors.SyntaxUnknownError, token);
                            }
                        } else {
                            // one more attempt to recover but from the next token
                            token = this.readToken();
                            // NOTE: in order to prevent recusrion on END_SYMBOL
                            causingErrorToken = undefinedToken;
                            continue;
                        }

                        causingErrorToken = Parser.cloneToken(token);
                        // token = { ...token, name: ERROR };
                        token = { ...Parser.cloneToken(token), name: ERROR };
                    }

                    op = syntaxTable[currStateIndex][token.name];

                    const errorProcessing = token.name === ERROR;
                    const errorReductionEnded = !op || (errorProcessing && (op.type === EOperationType.k_Shift));

                    // state must be recovered if operation is undefined or error reduction was ended. 
                    if (errorReductionEnded) {
                        // NOTE: recoveryToken, token, stack and parseTree will be update imlicitly inside the state restore routine. 
                        let recoveryToken = Parser.cloneToken(causingErrorToken);
                        while (recoveryToken.name === UNKNOWN_TOKEN) {
                            recoveryToken = this.readToken();
                        }
                        currStateIndex = this.restoreState(syntaxTable, <ParseTree>parseTree, stack, recoveryToken, token /* error token */);
                        if (currStateIndex === -1) {
                            this.emitCritical(EParserErrors.SyntaxRecoverableStateNotFound);
                        }

                        // perform error shift op.
                        op = syntaxTable[currStateIndex][token.name]; // token.name === 'ERROR'
                        stack.push(op.stateIndex);
                        parseTree.addToken(token/* error token */);
                        token = recoveryToken;

                        // const nextOp = syntaxTable[op.stateIndex][token.name];
                        // if (nextOp.type === EOperationType.k_Reduce) {
                        //     tokenBuffer.push(rec);
                        // }

                        // return to normal precesing loop
                        continue;
                    }
                }

                if (isDef(op)) {
                    switch (op.type) {
                        case EOperationType.k_Success:
                            break breakProcessing;

                        case EOperationType.k_Shift:
                            {
                                const stateIndex = op.stateIndex;
                                stack.push(stateIndex);
                                parseTree.addToken(token);

                                const additionalOperationCode = await this.operationAdditionalAction(stateIndex, token.name);
                                if (additionalOperationCode === EOperationType.k_Error) {
                                    this.emitCritical(EParserErrors.SyntaxUnknownError, token);
                                } else if (additionalOperationCode === EOperationType.k_Ok) {
                                    token = this.readToken();
                                }
                            }
                            break;

                        case EOperationType.k_Reduce:
                            {
                                const ruleLength = op.rule.right.length;
                                stack.length -= ruleLength;

                                const stateIndex = syntaxTable[stack[stack.length - 1]][op.rule.left].stateIndex;

                                stack.push(stateIndex);
                                parseTree.reduceByRule(op.rule, this._ruleCreationModeMap[op.rule.left]);

                                const additionalOperationCode = await this.operationAdditionalAction(stateIndex, op.rule.left);
                                if (additionalOperationCode === EOperationType.k_Error) {
                                    this.emitCritical(EParserErrors.SyntaxUnknownError, token);
                                }
                            }
                            break;
                    }
                } else {
                    assert(!allowErrorRecoverty, `unexpected end, something went wrong :/`);
                    this.emitCritical(EParserErrors.SyntaxUnknownError, token);
                }
            }

            parseTree.finishTree();
        } catch (e) {
            if (!(e instanceof DiagnosticException)) {
                throw e;
            }
        }
    }


    async parse(source: string): Promise<EParserCode> {
        this.defaultInit();

        this._source = source;
        this._lexer.init(source);

        const syntaxTable = this._syntaxTable;
        const stack = this._stack;
        const syntaxTree = this._syntaxTree;
        const debugMode = bf.testAll(this._parseMode, EParseMode.k_DebugMode);

        await this.run(syntaxTable, stack, this.readToken(), syntaxTree, { debugMode });

        if (this._diag.hasErrors()) {
            console.error('parsing was ended with errors.');
            return EParserCode.k_Error;
        }

        return EParserCode.k_Ok;
    }


    setParseFileName(filename: string): void {
        this._filename = StringRef.make(filename);
    }


    getParseFileName(): IFile {
        return this._filename;
    }


    printStates(isBaseOnly: boolean = true): void {
        if (!isDef(this._states)) {
            console.warn("It`s impossible to print states. You must init parser in debug-mode");
            return;
        }
        const mesg = "\n" + this.statesToString(isBaseOnly);
        console.log(mesg);
    }


    printState(stateIndex: number, isBaseOnly: boolean = true): void {
        if (!isDef(this._states)) {
            console.log("It`s impossible to print states. You must init parser in debug-mode.");
            return;
        }

        var state = this._states[stateIndex];
        if (!isDef(state)) {
            console.log("Can not print stete with index: " + stateIndex.toString());
            return;
        }

        console.log(`\n${state.toString(isBaseOnly, this.getGrammarSymbols())}`);
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
            fileName: this._filename,
            tree: this._syntaxTree,
            types: this._typeIdMap,
            stack: this._stack,
            token: this._token
        };
    }


    protected loadState(state: IParserState): void {
        this._source = state.source;
        this._filename = state.fileName;
        this._syntaxTree = state.tree;
        this._typeIdMap = state.types;
        this._stack = state.stack;
        this._token = state.token;

        this._lexer.setSource(state.source);
        this._lexer.setIndex(state.token.index);
    }


    addAdditionalFunction(funcName: string, fnRuleFunction: IRuleFunction): void {
        if (isNull(this._additionalFunctionsMap)) {
            this._additionalFunctionsMap = <IRuleFunctionMap>{};
        }
        this._additionalFunctionsMap[funcName] = fnRuleFunction;
    }


    addTypeId(identifier: string): void {
        if (isNull(this._typeIdMap)) {
            this._typeIdMap = <IMap<boolean>>{};
        }
        this._typeIdMap[identifier] = true;
    }


    protected defaultInit(): void {
        this._stack = [0];
        this._syntaxTree = new ParseTree(bf.testAll(this._parseMode, EParseMode.k_Optimize));
        this._typeIdMap = {};
        this._diag.reset();
    }


    private emitError(code: number, token: IToken) {
        this.error(code, { ...this._lexer.getLocation(), token });
    }

    private emitCritical(code: number, token: IToken = null) {
        this.critical(code, { ...this._lexer.getLocation(), token });
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
                        newOperation: Parser.operationToString(newOperation),
                        stateDesc: this._states[stateIndex].toString()
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
        // delete this._followTerminalsCache;
        delete this._productions;
        delete this._states;
        delete this._baseItems;
        delete this._firstTerminalsCache;
        delete this._closureForItemsCache;
        delete this._expectedExtensionDMap;
    }


    /**
     * Check for the state's dublicate.
     */
    private hasState(state: State, type: EParserType): State {
        return this._states.find(stateIth => stateIth.isEqual(state, type)) || null;
    }


    private nonTerminals(): string[] {
        return Object.keys(this._productions);
    }

    private rules(nonTerminal: string): IRule[] {
        const prods = this._productions[nonTerminal];
        return prods ? Object.keys(prods).map(ruleIndex => prods[ruleIndex]) : null;
    }

    private ruleCreationMode(symbol: string) {
        return this._ruleCreationModeMap[symbol];
    }

    /**
     * terminals & non-terminals;
     */
    private symbols(): string[] {
        return [...this._grammarSymbols.keys()];
    }

    private isTerminal(symbol: string): boolean {
        return !(this._productions[symbol]);
    }


    /**
     * Add item to 'stateList' and set item's index in it.
     */
    private pushState(state: State): void {
        state.index = this._states.length;
        this._states.push(state);
    }


    /**
     * Add item to 'baseItemList' and set item's index in it.
     */
    private pushBaseItem(item: Item): void {
        item.index = this._baseItems.length;
        this._baseItems.push(item);
    }


    private tryAddState(state: State, type: EParserType): State {
        let res = this.hasState(state, type);

        if (isNull(res)) {
            if (type === EParserType.k_LR0) {
                state.eachItem(item => this.pushBaseItem(item));
            }

            this.pushState(state);
            this.closure(state, type);

            return state;
        }

        return res;
    }


    private hasEmptyRule(symbol: string): boolean {
        if (this.isTerminal(symbol)) {
            return false;
        }

        return !!this.rules(symbol).find(rule => rule.right.length === 0);
    }


    private pushInSyntaxTable(syntaxTable: ISyntaxTable, stateIndex: number, symbol: string, operation: IOperation): void {
        syntaxTable[stateIndex] = syntaxTable[stateIndex] || {};

        if (isDef(syntaxTable[stateIndex][symbol])) {
            this.grammarError(EParserErrors.GrammarAddOperation, {
                stateIndex: stateIndex,
                grammarSymbol: this.convertGrammarSymbol(symbol),
                oldOperation: this._syntaxTable[stateIndex][symbol],
                newOperation: operation
            });
        }

        syntaxTable[stateIndex][symbol] = operation;
    }


    private addStateLink(state: State, nextState: State, symbol: string): void {
        let isAddState = state.addNextState(symbol, nextState);
        if (!isAddState) {
            this.grammarError(EParserErrors.GrammarAddStateLink, {
                stateIndex: state.index,
                oldNextStateIndex: state.nextStates[symbol] || null,
                newNextStateIndex: nextState.index,
                grammarSymbol: this.convertGrammarSymbol(symbol)
            });
        }
    }


    private firstTerminals(symbol: string): Terminals {
        if (this.isTerminal(symbol)) {
            return null;
        }

        if (isDef(this._firstTerminalsCache[symbol])) {
            return this._firstTerminalsCache[symbol];
        }

        const rules = this.rules(symbol);
        const res: Terminals = this._firstTerminalsCache[symbol] = new Set<string>();

        if (this.hasEmptyRule(symbol)) {
            res.add(T_EMPTY);
        }

        if (isNull(rules)) {
            return res;
        }

        for (let i = 0; i < rules.length; ++i) {
            const rule = rules[i];
            const right = rule.right;

            let isFinish = false;

            for (let j = 0; j < right.length; j++) {
                if (right[j] === symbol) {
                    if (res.has(T_EMPTY)) {
                        continue;
                    }

                    isFinish = true;
                    break;
                }

                const terminals = this.firstTerminals(right[j]);

                if (isNull(terminals)) {
                    res.add(right[j]);
                } else {
                    for (const terminal of terminals) {
                        res.add(terminal);
                    }
                }

                if (!this.hasEmptyRule(right[j])) {
                    isFinish = true;
                    break;
                }
            }

            if (!isFinish) {
                res.add(T_EMPTY);
            }
        }

        return res;
    }

    // private followTerminal(symbolVal: string): IMap<boolean> {
    //     if (isDef(this._followTerminalsCache[symbolVal])) {
    //         return this._followTerminalsCache[symbolVal];
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

    //     res = this._followTerminalsCache[symbolVal] = <IMap<boolean>>{};

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

    private firstTerminalsForSet(symbolList: string[], expectedSymbols: ExpectedSymbols): Terminals {
        const res = new Set<string>();

        for (let i = 0; i < symbolList.length; i++) {
            const terminals = this.firstTerminals(symbolList[i]);

            if (isNull(terminals)) {
                res.add(symbolList[i]);
                return res;
            }

            let isEmpty = false;
            for (const symbol of terminals) {
                if (symbol === T_EMPTY) {
                    isEmpty = true;
                    continue;
                }
                res.add(symbol);
            }

            if (!isEmpty) {
                return res;
            }
        }

        if (!isNull(expectedSymbols)) {
            expectedSymbols.forEach(expectedSymbol => res.add(expectedSymbol));
        }

        return res;
    }


    private generateRules(grammarSource: string): void {
        let allRuleList: string[] = grammarSource.split(/\r?\n/);
        let tempRule: string[];
        let rule: IRule;
        let isLexerBlock = false;

        this._productions = <IProductions>{};
        this._additionalFuncInfoList = <IAdditionalFuncInfo[]>[];
        this._ruleCreationModeMap = <IMap<number>>{};
        this._grammarSymbols = new Map([['END_SYMBOL', END_SYMBOL]]);

        let i = 0, j = 0;

        // append all nodes ignoring any flags
        const isAllNodeMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_AllNode);
        // force unwind node if it is marked as '--NN'
        const isNegateMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_Negate);
        // force add node if it is marked as '--AN'
        const isAddMode = bf.testAll(<number>this._parseMode, <number>EParseMode.k_Add);

        let symbolsWithNodeMap: IMap<number> = this._ruleCreationModeMap;

        let sName: string;

        let nRules = 0;

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
            if (!isDef(this._productions[tempRule[0]])) {
                this._productions[tempRule[0]] = <IRuleMap>{};
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

            rule.index = nRules;
            this._productions[tempRule[0]][rule.index] = rule;
            nRules++;

            // TODO: emit diagnostics error instead.
            assert(nRules != 1 || isDef(this._productions[START_SYMBOL][0]));
        }
    }


    private generateFunctionByStateMap(): void {
        if (isNull(this._additionalFunctionsMap)) {
            return;
        }

        var stateList = this._states;
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

                    if (!isDef(funcByStateDMap[stateList[j].index])) {
                        funcByStateDMap[stateList[j].index] = <IRuleFunctionMap>{};
                    }

                    funcByStateDMap[stateList[j].index][grammarSymbol] = func;
                }
            }
        }
    }


    private generateFirstState_LR0(): void {
        const state = new State();
        // START_SYMBOL should be always defined at the beginning of grammar
        const firstRule = this._productions[START_SYMBOL][0];
        const item = new Item(firstRule, 0);

        this.pushBaseItem(item);
        state.push(item);

        this.closure_LR0(state);
        this.pushState(state);
    }


    private generateFirstState_LR(): void {
        const state = new State();
        const firstRule = this._productions[START_SYMBOL][0];

        state.push(new Item(firstRule, 0, [END_SYMBOL]));

        this.closure_LR(state);
        this.pushState(state);
    }


    private closure(state: State, type: EParserType) {
        if (type === EParserType.k_LR0) {
            this.closure_LR0(state);
        } else {
            this.closure_LR(state);
        }
    }


    private closure_LR0(state: State) {
        // NOTE: loop grows implicitly inside state.tryPush() function.
        //       do not change this loop.
        state.eachItem(item => {
            const symbol = item.symbolName();
            if (symbol !== END_POSITION && !this.isTerminal(symbol)) {
                this.rules(symbol).forEach(rule => state.tryPush_LR0(rule, 0));
            }
        });
    }


    private closure_LR(state: State) {
        let isNewExpected: boolean;
        do {
            isNewExpected = false;
            state.eachItem(item => {
                const symbol = item.symbolName();
                if (symbol !== END_POSITION && !this.isTerminal(symbol)) {
                    const nextSymbols = item.rule.right.slice(item.pos + 1);
                    const expectedTerminals = this.firstTerminalsForSet(nextSymbols, item.expectedSymbols);

                    this.rules(symbol).forEach(rule => {
                        expectedTerminals.forEach(expectedTerminal => {
                            if (state.tryPush_LR(rule, 0, expectedTerminal)) {
                                isNewExpected = true;
                            }
                        });
                    });
                }
            });
        } while (isNewExpected);
    }


    private static nextState_LR0(state: State, symbol: string): State {
        const nextState = new State();

        state.eachItem(item => {
            if (item.symbolName() === symbol) {
                nextState.push(new Item(item.rule, item.pos + 1));
            }
        });

        return nextState;
    }


    private static nextState_LR(state: State, symbol: string): State {
        const nextState = new State();

        state.eachItem(item => {
            if (item.symbolName() === symbol) {
                const expectedSymbols = Array.from(item.expectedSymbols);
                nextState.push(new Item(item.rule, item.pos + 1, expectedSymbols));
            }
        });

        return nextState;
    }


    private deleteNotBaseItems(): void {
        this._states.forEach(state => state.deleteNotBase());
    }


    private closureForItem({ rule, pos }: Item): State {
        const indexVal = rule.index + "_" + pos;

        let state = this._closureForItemsCache[indexVal];
        if (isDef(state)) {
            return state;
        }

        state = new State();
        state.push(new Item(rule, pos, [UNUSED_SYMBOL]));

        this.closure_LR(state);
        this._closureForItemsCache[indexVal] = state;

        return state;
    }


    private addLinkExpected(item: Item, itemX: Item): void {
        let table = this._expectedExtensionDMap;
        let index = item.index;

        table[index] = table[index] || {};
        table[index][itemX.index] = true;
    }


    private determineExpected(testState: State, symbol: string): void {
        const stateNext = testState.nextStates[symbol] || null;

        if (isNull(stateNext)) {
            return;
        }

        // at this moment all items already 'base' because of
        // deleteNotBase() call before.
        testState.eachBaseItem(baseItem => {
            const state = this.closureForItem(baseItem);
            stateNext.eachBaseItem(baseItemNext => {
                const item = state.hasChildItem(baseItemNext);
                if (item) {
                    item.expectedSymbols.forEach(symbol => {
                        if (symbol === UNUSED_SYMBOL) {
                            this.addLinkExpected(baseItem, baseItemNext);
                        } else {
                            baseItemNext.addExpected(symbol);
                        }
                    })
                }
            });
        });
    }


    private generateLinksExpected(): void {
        const states = this._states;
        const symbols = this.symbols();

        states.forEach(state =>
            symbols.forEach(symbol =>
                this.determineExpected(state, symbol)));
    }


    private expandExpected(): void {
        const baseItems = this._baseItems;
        const itemExpected = baseItems.map(item => true);
        const table = this._expectedExtensionDMap;

        baseItems[0].addExpected(END_SYMBOL);
        itemExpected[0] = (true);

        let isNewExpected: boolean;
        do {
            isNewExpected = false;
            baseItems.forEach((baseItem) => {
                if (itemExpected[baseItem.index] && isDefAndNotNull(table[baseItem.index])) {
                    let indexesOfExpectedItems = Object.keys(table[baseItem.index]).map(idx => Number(idx));

                    baseItem.expectedSymbols.forEach(expectedSymbol => {
                        indexesOfExpectedItems.forEach(expectedIndex => {
                            const baseItemExpected = baseItems[expectedIndex];
                            if (baseItemExpected.addExpected(expectedSymbol)) {
                                itemExpected[expectedIndex] = true;
                                isNewExpected = true;
                            }
                        });
                    });
                }
                itemExpected[baseItem.index] = false;
            });
        } while (isNewExpected);
    }


    private generateStates(type: EParserType): void {
        if (type === EParserType.k_LR0) {
            this.generateStates_LR0();
        }
        else if (type === EParserType.k_LR1) {
            this.generateStates_LR();
        }
        else if (type === EParserType.k_LALR) {
            this.generateStates_LALR();
        }
    }


    private generateStates_LR0(): void {
        this.generateFirstState_LR0();

        const stateList = this._states;
        const symbols = this.symbols();

        // NOTE: do not change this loop!
        for (let i = 0; i < stateList.length; i++) {
            const state = stateList[i];
            for (let j = 0; j < symbols.length; j++) {
                const symbol = symbols[j];
                let stateNext = Parser.nextState_LR0(state, symbol);

                if (!stateNext.isEmpty()) {
                    stateNext = this.tryAddState(stateNext, EParserType.k_LR0);
                    this.addStateLink(state, stateNext, symbol);
                }
            }
        }
    }


    private generateStates_LR(): void {
        this._firstTerminalsCache = {};
        this.generateFirstState_LR();

        const stateList = this._states;
        const symbols = this.symbols();

        // NOTE: do not change this loop!
        for (let i = 0; i < stateList.length; i++) {
            const state = stateList[i];
            for (let j = 0; j < symbols.length; j++) {
                let symbol = symbols[j];
                let stateNext = Parser.nextState_LR(state, symbol);

                if (!stateNext.isEmpty()) {
                    stateNext = this.tryAddState(stateNext, EParserType.k_LR1);
                    this.addStateLink(state, stateNext, symbol);
                }
            }
        }
    }

    private generateStates_LALR(): void {
        this._baseItems = [];
        this._expectedExtensionDMap = {};
        this._closureForItemsCache = {};
        this._firstTerminalsCache = {};

        this.generateStates_LR0();
        this.deleteNotBaseItems();
        this.generateLinksExpected();
        this.expandExpected();

        this._states.forEach(state => this.closure_LR(state));
    }


    private addReducing(syntaxTable: ISyntaxTable, state: State, reduceOperationsMap: IOperationMap): void {
        state.eachItem(item => {
            if (item.symbolName() === END_POSITION) {
                if (item.rule.left === START_SYMBOL) {
                    this.pushInSyntaxTable(syntaxTable, state.index, END_SYMBOL, { type: EOperationType.k_Success });
                } else {
                    for (const expectedSymbol of item.expectedSymbols) {
                        this.pushInSyntaxTable(syntaxTable, state.index, expectedSymbol, reduceOperationsMap[item.rule.index]);
                    }
                }
            }
        });
    }


    private addShift(syntaxTable: ISyntaxTable, state: State, shiftOperationsMap: IOperationMap) {
        const nextStates = state.nextStates;
        const nextSymbols = Object.keys(nextStates);
        for (let i = 0; i < nextSymbols.length; i++) {
            const nextState = nextStates[nextSymbols[i]];
            this.pushInSyntaxTable(syntaxTable, state.index, nextSymbols[i], shiftOperationsMap[nextState.index]);
        }
    }

    private buildSyntaxTable(): void {
        this._states = [];
        this._syntaxTable = {};

        const stateList = this._states;
        const syntaxTable = this._syntaxTable;

        this.generateStates(this._type);

        const reduceOperationsMap: IOperationMap = {};
        const shiftOperationsMap: IOperationMap = {};

        stateList.forEach(state => {
            shiftOperationsMap[state.index] = <IOperation>{
                type: EOperationType.k_Shift,
                stateIndex: state.index
            };
        })

        const nonTerminals = this.nonTerminals();
        nonTerminals.forEach(nonTerminal => {
            this.rules(nonTerminal).forEach(rule => {
                reduceOperationsMap[rule.index] = {
                    type: EOperationType.k_Reduce,
                    rule: rule
                };
            });
        });

        //Build syntax table
        stateList.forEach(state => {
            this.addReducing(syntaxTable, state, reduceOperationsMap);
            this.addShift(syntaxTable, state, shiftOperationsMap);
        });
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
        const syntaxTable = this._syntaxTable;
        const stack = this._stack;
        const token = isNull(this._token) ? this.readToken() : this._token;
        const syntaxTree = this._syntaxTree;
        await this.run(syntaxTable, stack, token, syntaxTree, {});

        if (this._diag.hasErrors()) {
            console.error('parsing was ended with errors.');
            return EParserCode.k_Error;
        }

        return EParserCode.k_Ok;
    }


    private statesToString(isBaseOnly: boolean = true): string {
        if (!this._states) {
            return "";
        }

        let msg = "";
        for (let i = 0; i < this._states.length; i++) {
            msg += this._states[i].toString(isBaseOnly, this._grammarSymbols);
            msg += " ";
        }

        return msg;
    }


    private static operationToString(operation: IOperation): string {
        let opVal: string = "";

        switch (operation.type) {
            case EOperationType.k_Shift:
                opVal = "SHIFT to state " + operation.stateIndex.toString();
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


    private convertGrammarSymbol(symbol: string): string {
        if (!this.isTerminal(symbol)) {
            return symbol;
        } else {
            return this._lexer.getTerminalValueByName(symbol);
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


    protected error(code, desc) {
        this._diag.error(code, desc);
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
        console.time();
        console.log('%c Creating parser....', 'background: #222; color: #bada55');
        Parser.$parserParams = parserParams;
        Parser.$parser = new ParserConstructor();

        if (!Parser.$parser.init(grammar, mode, type)) {
            console.error('Could not initialize parser!');
            Parser.$parser = null;
        } else {
            console.log('%c [ DONE ]', 'background: #222; color: #bada55');
        }
        console.timeEnd();

        return Parser.$parser;
    }


    static async parse(content: string, filename: string = "stdin") {
        Parser.$parser.setParseFileName(filename);

        const timeLabel = `parse ${filename}`;
        console.time(timeLabel);
        // All diagnostic exceptions should be already handled inside parser.
        let result = await Parser.$parser.parse(content);
        console.timeEnd(timeLabel);

        let diag = Parser.$parser.getDiagnostics();
        let ast = Parser.$parser.getSyntaxTree();

        // todo: fix this hack
        Parser.$parser.setParseFileName("stdin");

        return { result, diag, ast };
    }
}
