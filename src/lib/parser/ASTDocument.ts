import bf from "@lib/bf";
import { isDef } from "@lib/common";
import { IDiagnosticReport } from "@lib/idl/IDiagnostics";
import { IMap } from "@lib/idl/IMap";
import { EOperationType, EParserCode, IASTConfig, IASTDocument, IASTDocumentFlags, IFile, IParseNode, IParser, IParseTree, IPosition, IRange, IRuleFunction, ISyntaxTable, IToken } from "@lib/idl/parser/IParser";
import { DiagnosticException, Diagnostics } from "@lib/util/Diagnostics";
import { StringRef } from "@lib/util/StringRef";
import { assert } from "@lib/common";
import { isNull } from "util";

import { Lexer } from "./Lexer";
import { ParseTree } from "./ParseTree";
import { END_SYMBOL, ERROR, UNKNOWN_TOKEN } from "./symbols";
import { extendRange } from "./util";

export enum EParserErrors {
    SyntaxUnknownError = 2051,
    SyntaxUnexpectedEOF,
    SyntaxRecoverableStateNotFound,

    GeneralCouldNotReadFile = 2200,
    GeneralParsingLimitIsReached
};



export class ParsingDiagnostics extends Diagnostics<IMap<any>> {
    constructor() {
        super("Parsing diagnostics", 'P');
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
            [EParserErrors.SyntaxUnknownError]: "Syntax error during parsing. Token: '{token.value}'\n" +
                "Line: {token.loc.start.line}. Column: {token.loc.start.column}.",
            [EParserErrors.SyntaxUnexpectedEOF]: "Syntax error. Unexpected EOF.",
            [EParserErrors.GeneralCouldNotReadFile]: "Could not read file '{target}'.",
            [EParserErrors.GeneralParsingLimitIsReached]: "Parsing limit is reached.",
            [EParserErrors.SyntaxRecoverableStateNotFound]: "Recoverable state not found."
        };
    }
}


function cloneToken(token: IToken): IToken {
    return {
        ...token,
        loc: {
            start: { ...token.loc.start },
            end: { ...token.loc.end }
        }
    };
}


export class ASTDocument implements IASTDocument {
    protected parser: IParser;
    protected flags: number;

    protected diag: ParsingDiagnostics;
    protected tree: IParseTree;
    protected stack: number[];
    protected knownTypes: Set<string>;
    protected ruleFunctions: Map<string, IRuleFunction>;
    protected lexer: Lexer;

    constructor(config: IASTConfig) {
        assert(config.parser, 'parser engine is not defined');
        this.init(config);
    }

    protected init({ parser, uri, source, flags = IASTDocumentFlags.k_Optimize, knownTypes = new Set(), ruleFunctions = new Map }: IASTConfig) {
        const lexerEngine = parser.lexerEngine;

        this.parser = parser;
        this.flags = flags;
        this.diag = new ParsingDiagnostics;
        this.tree = new ParseTree(bf.testAll(flags, IASTDocumentFlags.k_Optimize));
        this.stack = [0];
        this.knownTypes = knownTypes;
        this.ruleFunctions = ruleFunctions;
        this.lexer = new Lexer({
            engine: lexerEngine,
            uri: StringRef.make(uri),
            knownTypes,
            source
        });
    }


    get uri(): string {
        return this.lexer.uri.toString();
    }


    get diagnosticReport(): IDiagnosticReport {
        let lexerReport = this.lexer.getDiagnosticReport();
        let parserReport = this.diag.resolve();
        return Diagnostics.mergeReports([lexerReport, parserReport]);
    }

    get root(): IParseNode {
        return this.tree.root;
    }


    private readToken(): IToken {
        return this.lexer.getNextToken();
    }

    private emitError(code: number, token: IToken) {
        this.diag.error(code, { ...this.lexer.getLocation(), token });
    }

    private emitCritical(code: number, token: IToken = null) {
        this.diag.critical(code, { ...this.lexer.getLocation(), token });
    }

    async parse(): Promise<EParserCode> {
        const developerMode = bf.testAll(this.flags, IASTDocumentFlags.k_DeveloperMode);
        const allowErrorRecoverty = true;

        await this.run(this.readToken(), { developerMode, allowErrorRecoverty });

        if (this.diag.hasErrors()) {
            console.error('parsing was ended with errors.');
            return EParserCode.k_Error;
        }

        return EParserCode.k_Ok;
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

            extendRange(errorToken.loc, causingErrorToken.loc);

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

    private async operationAdditionalAction(stateIndex: number, grammarSymbol: string): Promise<EOperationType> {
        const funcName = this.parser.findFunctionByState(stateIndex, grammarSymbol);
        if (!isNull(funcName)) {
            assert(!!this.ruleFunctions.has(funcName));
            return await this.ruleFunctions.get(funcName)();
        }
        return EOperationType.k_Ok;
    }

    async run(token: IToken,
        { developerMode = false, allowErrorRecoverty = true }): Promise<void> {

        const { syntaxTable } = this.parser;
        const { stack, tree } = this;

        const undefinedToken: IToken = { index: -1, name: null, value: null };
        let causingErrorToken: IToken = undefinedToken;

        // debug mode
        const opLimit = 10000;
        let opCounter = 0;

        try {
            breakProcessing:
            while (true) {
                // global recursion prevention in debug mode
                if (developerMode) {
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

                        causingErrorToken = cloneToken(token);
                        // token = { ...token, name: ERROR };
                        token = { ...cloneToken(token), name: ERROR };
                    }

                    op = syntaxTable[currStateIndex][token.name];

                    const errorProcessing = token.name === ERROR;
                    const errorReductionEnded = !op || (errorProcessing && (op.type === EOperationType.k_Shift));

                    // state must be recovered if operation is undefined or error reduction was ended. 
                    if (errorReductionEnded) {
                        // NOTE: recoveryToken, token, stack and parseTree will be update imlicitly inside the state restore routine. 
                        let recoveryToken = cloneToken(causingErrorToken);
                        while (recoveryToken.name === UNKNOWN_TOKEN) {
                            recoveryToken = this.readToken();
                        }
                        currStateIndex = this.restoreState(syntaxTable, <ParseTree>tree, stack, recoveryToken, token /* error token */);
                        if (currStateIndex === -1) {
                            this.emitCritical(EParserErrors.SyntaxRecoverableStateNotFound);
                        }

                        // perform error shift op.
                        op = syntaxTable[currStateIndex][token.name]; // token.name === 'ERROR'
                        stack.push(op.stateIndex);
                        tree.addToken(token/* error token */);
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
                                tree.addToken(token);

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
                                tree.reduceByRule(op.rule, this.parser.getRuleCreationMode(op.rule.left));

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

            tree.finishTree();
        } catch (e) {
            if (!(e instanceof DiagnosticException)) {
                throw e;
            }
        }
    }

    // protected async resumeParse(): Promise<EParserCode> {
    //     const syntaxTable = this.engine.syntaxTable;
    //     const stack = this.stack;
    //     const token = isNull(this._state.token) ? this.readToken() : this._state.token;
    //     const syntaxTree = this._state.tree;
    //     await this.run(syntaxTable, stack, token, syntaxTree, {});

    //     if (this._state.diag.hasErrors()) {
    //         console.error('parsing was ended with errors.');
    //         return EParserCode.k_Error;
    //     }

    //     return EParserCode.k_Ok;
    // }
}
