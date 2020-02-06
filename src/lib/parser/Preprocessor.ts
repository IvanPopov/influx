import { isDef, isDefAndNotNull } from "@lib/common";
import { assert, isNull, isString } from "@lib/common";
import { defaultSLParser } from "@lib/fx/SLParser";
import { createTextDocument } from "@lib/fx/TextDocument";
import { EDiagnosticCategory, IDiagnosticReport } from "@lib/idl/IDiagnostics";
import { IMap } from "@lib/idl/IMap";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IMacro } from "@lib/idl/parser/IMacro";
import { ETokenType, IFile, ILexer, ILexerEngine, IRange, IToken } from "@lib/idl/parser/IParser";
import * as util from '@lib/parser/util';
import * as URI from "@lib/uri/uri";
import { Diagnostics } from "@lib/util/Diagnostics";

import { Lexer } from "./Lexer";
import { Macros } from "./Macros";
import { END_SYMBOL, T_MACRO, T_MACRO_CONCAT, T_NON_TYPE_ID, T_TYPE_ID } from "./symbols";

let DEBUG_MACRO = false;

declare const PRODUCTION: boolean;

enum EMacroState {
    k_AllowElse,
    k_ForbidElse
};


interface IMacroFunc {
    op: (...args: IToken[]) => IToken;
    length: number;
}


export enum EPreprocessorErrors {
    SyntaxUnknownError = 7051,
    GeneralCouldNotReadFile = 7200,
    MacroUnknownError,
};


export enum EPreprocessorWarnings {
    MacroUnknownWarning = 3000,
}


export class PreprocessorDiagnostics extends Diagnostics<IMap<any>> {
    constructor() {
        super("Preprocessor diagnostics", 'M');
    }


    protected resolveFilename(category: EDiagnosticCategory, code: number, desc: IMap<any>): string {
        return desc.file;
    }


    protected resolveRange(category: EDiagnosticCategory, code: number, desc: IMap<any>): IRange {
        if (category === EDiagnosticCategory.k_Warning) {
            switch (code) {
                case EPreprocessorWarnings.MacroUnknownWarning:
                    return desc.loc;
            }
        }

        //
        // errors
        //

        switch (code) {
            case EPreprocessorErrors.SyntaxUnknownError:
                return desc.token.loc;
            case EPreprocessorErrors.GeneralCouldNotReadFile:
                return desc.loc;
            case EPreprocessorErrors.MacroUnknownError:
                return desc.loc;
        }

        return null;
    }



    protected diagnosticMessages() {
        return {
            [EPreprocessorErrors.SyntaxUnknownError]: "Syntax error during parsing. Token: '{token.value}'\n" +
                "Line: {token.loc.start.line}. Column: {token.loc.start.column}.",
            [EPreprocessorErrors.GeneralCouldNotReadFile]: "Could not read file '{target}'.",
        };
    }

    protected resolveDescription(code: number, category: EDiagnosticCategory, desc: IMap<any>): string {
        let descList = this.diagnosticMessages();
        if (isDefAndNotNull(descList[code])) {
            return super.resolveDescription(code, category, desc);
        }

        let { file, loc, ...data } = desc;
        if (category == EDiagnosticCategory.k_Warning) {
            return `${EPreprocessorWarnings[code]}: ${JSON.stringify(data)}`;
        }
        return `${EPreprocessorErrors[code]}: ${JSON.stringify(data)}`;
    }
}



// as macro token
/** @deprecated */
function createMacroToken(value: string, loc: IRange): IToken {
    assert(isString(value), value);
    return { index: -1, type: ETokenType.k_Unknown, name: T_MACRO, value, loc };
}


function asMacroFunc(fn: (...args: IToken[]) => number | boolean): IMacroFunc {
    return {
        op: (...args: IToken[]): IToken => {
            const value = String(fn(...args));
            const loc = util.commonRange(...args.map(arg => arg.loc));
            return createMacroToken(value, loc);
        },
        length: fn.length
    };
}


function macroToDocument(macro: IMacro): ITextDocument {
    const source = macro.text.value;
    const uri = macro.text.loc.start.file;
    const offset = macro.text.loc.start;
    return createTextDocument(uri, source, offset);
}


function tokenToNative(token: IToken, fallback: (token: IToken) => number = () => NaN) {
    const value = token.value;

    if (String(value) === 'true') {
        return 1;
    }

    if (String(value) === 'false') {
        return 0;
    }

    // TODO: replace this check
    if (String(Number(value)) === String(value)) {
        return Number(value);
    }

    return fallback(token)
}


class MacroState {
    states: EMacroState[] = [];

    is(state: EMacroState): boolean {
        return this.states[this.states.length - 1] === state;
    }

    isEmpty(): boolean {
        return this.states.length === 0;
    }

    push(state: EMacroState): void {
        this.states.push(state);
    }

    pop(): EMacroState {
        return this.states.pop();
    }

    replace(state: EMacroState): void {
        this.pop();
        this.push(state);
    }
}


enum EPPDocumentFlags {
    k_None = 0x00,
    k_Macro = 0x01,
    k_Include = 0x02
}


export class Preprocessor {
    protected stack: {
        lexer: ILexer;
        tokens: IToken[];
        flags: number;  // EPPDocumentFlags 
        loc: IRange;
    }[];
    protected includes: number[];

    protected diagnostics: PreprocessorDiagnostics;

    /* protected */ macros: Macros;
    /* protected */ macroState: MacroState;
    /* protected */ unreachableCodeList: IRange[];
    /* protected */ includeMap: Map<string, IRange>;

    /* protected */ unresolvedMacros: IMacro[];

    protected knownTypes: Set<string>;
    protected lexerEngine: ILexerEngine;

    protected lexerReport: IDiagnosticReport;

    document: ITextDocument;

    constructor(lexerEngine: ILexerEngine, knownTypes: Set<string> = new Set, macros = new Macros, diag = new PreprocessorDiagnostics) {
        this.macros = macros;

        this.macroState = new MacroState;
        this.includeMap = new Map;

        this.unreachableCodeList = [];
        this.unresolvedMacros = [];

        this.knownTypes = knownTypes;
        this.lexerEngine = lexerEngine;

        this.diagnostics = diag;
        this.lexerReport = null;
        // TODO: add initital document to includeList !!!

        this.stack = [];
        this.includes = [];
    }


    get lexer(): ILexer {
        return this.stack[this.stack.length - 1].lexer;
    }


    get tokens(): IToken[] {
        return this.stack[this.stack.length - 1].tokens;
    }


    get uri(): IFile {
        return this.document.uri;
    }

    /** Current location stack (each location contains ".source" property inside.) */
    // get location(): IRange {
    //     return this.stack[this.stack.length - 1].loc;
    // }


    /** Top location of the macro if presented or null otherwise. */
    macroLocation(): IRange {
        // return first macro location in the current document
        const latestInclude = this.includes[this.includes.length - 1];
        if (latestInclude < this.stack.length - 1) {
            return this.stack[latestInclude + 1].loc;
        }

        // return null (we are alrady in the current document)
        return null;
    }

    currentMacro(): IMacro {
        return this.macros.root;
    }

    getDiagnosticReport(): IDiagnosticReport {
        return Diagnostics.mergeReports([this.lexerReport, this.diagnostics.resolve()]);
    }


    readLine(): IToken {
        return this.lexer.getNextLine();
    }


    setTextDocument(textDocument: ITextDocument): Preprocessor {
        this.document = textDocument;
        this.pushDocument(textDocument, null, EPPDocumentFlags.k_Include);
        return this;
    }


    protected pushDocument(textDocument: ITextDocument, loc: IRange, flags: number, macro: IMacro = null): void {
        const lexer = new Lexer({ engine: this.lexerEngine, knownTypes: this.knownTypes });
        lexer.setTextDocument(textDocument);
        const tokens = <IToken[]>[];

        /// link location into chain
        // if (loc) {
        //     loc.source = this.stack[this.stack.length - 1].loc;
        // }


        if (flags & EPPDocumentFlags.k_Macro) {
            assert(isDefAndNotNull(macro));
            this.macros.push(macro);
        }

        if (flags & EPPDocumentFlags.k_Include) {
            this.includes.push(this.stack.length);

            // assert(!this.includeMap.has(`${textDocument.uri}`));
            this.includeMap.set(`${textDocument.uri}`, loc);
        }

        this.stack.push({ lexer, tokens, flags, loc });
    }


    protected pop(): void {
        const { flags, lexer } = this.stack.pop();

        // FIXME: do not Lexer type
        if (!(lexer as Lexer).diagnostics.isEmpty()) {
            this.lexerReport = Diagnostics.mergeReports([this.lexerReport, lexer.getDiagnosticReport()]);
        }

        if (flags & EPPDocumentFlags.k_Macro) {
            this.macros.pop();
        }

        if (flags & EPPDocumentFlags.k_Include) {
            this.includes.pop();
        }
    }

    protected pushToken(...tokens: IToken[]): void {
        this.tokens.push(...tokens);
    }


    protected popToken(): IToken {
        return this.tokens.shift() || null;
    }


    readToken(allowMacro: boolean = true, allowStateChanging = true): IToken {
        const token = this.popToken() || this.lexer.getNextToken();

        switch (token.name) {
            case T_MACRO:
                if (allowMacro) {
                    return this.readMacro(token);
                }
                break;
            case END_SYMBOL:
                if (allowStateChanging) {
                    if (this.stack.length > 1) {
                        this.pop();
                        return this.readToken(allowMacro);
                    }

                    if (!this.macroState.isEmpty()) {
                        // TODO: highlight open tag too.
                        this.emitMacroError(`'endif' not found :/`, token.loc);
                    }
                }
                break
            default:
                if (allowMacro) {
                    return this.examMacro(token);
                }
        }

        return token;
    }

    protected readMacro(token: IToken): IToken {
        switch (token.value) {
            case '#define': return this.processDefineMacro(token);
            case '#ifdef': return this.processIfdefMacro(token);
            case '#ifndef': return this.processIfndefMacro(token);
            case '#endif': return this.processEndifMacro(token);
            case '#else': return this.processElseMacro(token);
            case '#elif': return this.processElifMacro(token);
            case '#if': return this.processIfMacro(token);
            case '#error': return this.processErrorMacro(token);
            case '#include': return this.processIncludeMacro(token);
            case '#pragma': {
                this.readLine();
                return this.readToken();
            }
        }

        this.emitMacroWarning(`unsupported macro type found: ${token.value}`, token.loc)
        return this.readToken();
    }


    protected processDefineMacro(token: IToken): IToken {
        const name = this.readToken(false);
        const text = this.readLine();

        if (name.name !== T_NON_TYPE_ID) {
            // TODO: emit error
            assert(name.name === T_NON_TYPE_ID);
            return this.readToken();
        }


        if (this.macros.has(name.value)) {
            this.emitMacroWarning(`macro redefinition found: ${name.value}`, name.loc);
        }

        const macro = this.processMacro(name, text);
        if (macro) {
            const unresolvedMacro = this.unresolvedMacros.find(macro => macro.name === name.value);
            if (unresolvedMacro) {
                macro.bRegionExpr = unresolvedMacro.bRegionExpr;
                // TODO: remove this hack
                this.unresolvedMacros = this.unresolvedMacros.filter(macro => macro.name !== name.value);
            }

            this.macros.set(macro);
        }

        return this.readToken();
    }


    protected processMacro(name: IToken, text: IToken): IMacro {
        let bFunction = false;
        let bRegionExpr = false;
        let params: string[] = null;

        if (!/^\s*$/.test(text.value)) {

            //
            // process macro params
            //

            const lexer = new Lexer({ engine: this.lexerEngine });
            const uri = text.loc.start.file;
            const source = text.value;
            const offset = text.loc.start;
            lexer.setTextDocument(createTextDocument(uri, source, offset));

            let token = lexer.getNextToken();

            const bOpenBracket = token.value === '(';
            const bSameLine = token.loc.start.line === name.loc.end.line;
            const bNoSpace = token.loc.start.column === name.loc.end.column;

            // A bit tricky way to separate macro like:
            // >  #define NAME(A, B)
            // from the macro:
            // >  #define NAME (A, B)
            // and macro like:
            // >  #define NAME\
            // >              (A, B)

            // note: only macro like 'NAME(a, b)' is a valid function-like macro (no spaces allowed)

            if (bOpenBracket && bSameLine && bNoSpace) {
                params = [];
                bFunction = true;
                let bExpectComma = false;
                token = lexer.getNextToken();
                while (token.name !== END_SYMBOL && token.value !== ')') {
                    if (bExpectComma) {
                        if (token.value !== ',') {
                            this.emitMacroError(`invalid macro, comma expected`, token.loc);
                            return null;
                        }
                    } else {
                        if (token.name !== T_NON_TYPE_ID) {
                            this.emitMacroError('invalid token found. only identifiers allowed as param names', token.loc);
                            return null;
                        }
                        params.push(token.value);
                    }

                    bExpectComma = !bExpectComma;
                    token = lexer.getNextToken();
                }

                if (token.name === END_SYMBOL) {
                    this.emitMacroError(`comma mismatch`, token.loc);
                    return null;
                }

                text = lexer.getNextLine();
            }
        } else {
            text.value = '';
        }

        return { name: name.value, text, bFunction, params, bRegionExpr };
    }


    protected processIfdefMacro(token: IToken): IToken {
        const exprValue = this.resolveDefMacro(this.readLine());

        if (exprValue) {
            this.macroState.push(EMacroState.k_ForbidElse);
            return this.readToken();
        }

        this.macroState.push(EMacroState.k_AllowElse);
        return this.skipUnreachableCode(token);
    }


    protected processIfndefMacro(token: IToken): IToken {
        const exprValue = this.resolveDefMacro(this.readLine());

        if (exprValue) {
            this.macroState.push(EMacroState.k_AllowElse);
            return this.skipUnreachableCode(token);
        }

        this.macroState.push(EMacroState.k_ForbidElse);
        return this.readToken();
    }


    protected processIfMacro(token: IToken): IToken {
        if (this.resolveMacroInner(this.readLine())) {
            this.macroState.push(EMacroState.k_ForbidElse);
            return this.readToken();
        }

        this.macroState.push(EMacroState.k_AllowElse);
        return this.skipUnreachableCode(token);
    }


    protected processElifMacro(token: IToken): IToken {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, token.loc);
            return this.readToken();
        }

        if (this.macroState.is(EMacroState.k_AllowElse)) {
            if (this.resolveMacroInner(this.readLine())) {
                this.macroState.replace(EMacroState.k_ForbidElse);
                return this.readToken();
            }
        }

        return this.skipUnreachableCode(token);
    }


    protected processElseMacro(token: IToken): IToken {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, token.loc);
            return this.readToken();
        }

        if (this.macroState.is(EMacroState.k_AllowElse)) {
            this.macroState.replace(EMacroState.k_ForbidElse);
            return this.readToken();
        }

        return this.skipUnreachableCode(token);
    }


    protected processEndifMacro(token: IToken): IToken {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, token.loc);
            return this.readToken();
        }

        this.macroState.pop();
        return this.readToken();
    }


    protected resolveDefMacro(textToken: IToken): number {
        const macros = this.macros;

        // TODO: reuse precreated lexers
        const lexer = new Lexer({ engine: this.lexerEngine });
        const source = textToken.value;
        const offset = textToken.loc.start;
        const uri = textToken.loc.start.file;
        lexer.setTextDocument(createTextDocument(uri, source, offset));

        const asRaw = (token: IToken): number => tokenToNative(token, ({ value }) => {
            const macro = macros.get(value);
            if (macro) {
                // mark macro as a part of ifdef/else expression
                macro.bRegionExpr = true;
                return 1;
            }
            this.addUnresolvedMacro(value);
            return 0;
        });
        const asFn = asMacroFunc;
        const asValue = asFn(asRaw);

        const opPriors = {
            '(': 1, ')': 1,
            '&&': 2,
            '||': 3,
            '!': 8
        };

        const opLogic = {
            '&&': asFn((a, b) => asRaw(a) && asRaw(b)),
            '||': asFn((a, b) => asRaw(a) || asRaw(b)),
            '!': asFn((a) => !asRaw(a)),
            'asValue': asValue
        };

        const exprValue = this.evaluateMacroExpr(lexer, opPriors, opLogic, {});
        return exprValue;
    }


    protected resolveMacroInner(textToken: IToken): number {
        // TODO: reuse precreated lexers
        const lexer = new Lexer({ engine: this.lexerEngine });
        const source = textToken.value;
        const offset = textToken.loc.start;
        const uri = textToken.loc.start.file;
        lexer.setTextDocument(createTextDocument(uri, source, offset));

        const macros = this.macros;

        const asRaw = (token: IToken) => this.resolveMacro(token);
        const asFn = asMacroFunc;
        const asValue = asFn(asRaw);

        const opPriors = {
            '(': 1, ')': 1,
            '||': 2,
            '&&': 3,
            '<': 4, '>': 4, '<=': 4, '>=': 4,
            '==': 5, '!=': 5,
            '+': 6, '-': 6,
            '*': 7, '/': 7,
            '!': 8,
            'defined': 9
        };

        // TODO: add conditional operator
        // TODO: add unary '+' and unary '-' operators
        const opLogic = {
            '&&': asFn((a, b) => asRaw(a) && asRaw(b)),
            '||': asFn((a, b) => asRaw(a) || asRaw(b)),
            '!': asFn((a) => !asRaw(a)),
            '+': asFn((a, b) => asRaw(a) + asRaw(b)),
            '-': asFn((a, b) => asRaw(a) - asRaw(b)),
            '*': asFn((a, b) => asRaw(a) * asRaw(b)),
            '/': asFn((a, b) => asRaw(a) / asRaw(b)),
            '<': asFn((a, b) => asRaw(a) < asRaw(b)),
            '>': asFn((a, b) => asRaw(a) > asRaw(b)),
            '<=': asFn((a, b) => asRaw(a) <= asRaw(b)),
            '>=': asFn((a, b) => asRaw(a) >= asRaw(b)),
            '==': asFn((a, b) => asRaw(a) === asRaw(b)),
            '!=': asFn((a, b) => asRaw(a) !== asRaw(b)),
            'asValue': asValue
        };

        //
        // Wrap all macro functions to native 
        //

        const macroFuncs = <IMap<IMacroFunc>>{
            'defined': asFn((a: IToken) => {
                const macro = macros.get(a.value);
                if (macro) {
                    macro.bRegionExpr = true;
                    return 1;
                }
                this.addUnresolvedMacro(a.value);
                return 0;
            }),
        };

        // TODO: move list construction to preprocess
        macros.forEach((macro: IMacro) => {
            if (macro.bFunction) {
                opPriors[macro.name] = 10;
                macroFuncs[macro.name] = {
                    op: (...args: IToken[]): IToken => {
                        macros.push(macro);

                        assert(macro.params.length === args.length);
                        const params = macro.params;

                        for (let i = 0; i < params.length; ++i) {
                            if (DEBUG_MACRO) {
                                console.log(`${macro.name}.${params[i]} => ${args[i].value}`, isString(args[i].value));
                            }
                            macros.set({
                                name: params[i],
                                text: args[i],
                                bFunction: false,
                                params: null,
                                bRegionExpr: false
                            });
                        }

                        const value = String(this.resolveMacroInner(macro.text));
                        macros.pop();

                        // TODO: use min/max instead?
                        const loc = util.commonRange(...args.map(arg => arg.loc));
                        return createMacroToken(value, loc);
                    },

                    length: macro.params.length
                };
            }
        });

        return this.evaluateMacroExpr(lexer, opPriors, opLogic, macroFuncs);
    }


    protected resolveMacro(textToken: IToken): number {
        return tokenToNative(textToken, (token) => {
            const macro = this.macros.get(token.value);
            if (!isNull(macro) && !isNull(macro.text)) {
                const exprValue = this.resolveMacroInner(macro.text);

                if (DEBUG_MACRO) {
                    console.log(`macro '${token.value}:${macro.text.value}' resolved to '${exprValue}''`);
                }

                return exprValue;
            }

            this.emitMacroWarning(`cannot resolve macro '${token.value}'`, textToken.loc);
            this.addUnresolvedMacro(token.value);

            return NaN;
        });
    }


    protected addUnresolvedMacro(name: string): void {
        if (this.unresolvedMacros.find(macro => macro.name === name)) {
            return;
        }

        this.unresolvedMacros.push({
            bFunction: false,
            name,
            params: null,
            text: null,
            bRegionExpr: true
        });
    }


    protected evaluateMacroExpr(lexer: ILexer,
        opPriors: IMap<number>,
        opLogic: IMap<IMacroFunc>,
        macroFuncs: IMap<IMacroFunc> = {}): number {

        const values = <IToken[]>[];
        const opStack = <IToken[]>[];

        let token = lexer.getNextToken();

        //
        // Transform input sequence to reverse Polish notation
        //

        exit:
        while (true) {
            switch (token.name) {
                case 'T_NON_TYPE_ID':
                    // process functional macros as operators
                    if (macroFuncs[token.value]) {
                        opStack.push(token);
                        break;
                    }

                    values.push(token);
                    break;

                case 'T_UINT':
                case 'T_KW_TRUE':
                case 'T_KW_FALSE':
                    values.push(token);
                    break;
                case 'T_PUNCTUATOR_40': // '('
                    opStack.push(token);
                    break;
                case 'T_PUNCTUATOR_41': // ')'
                    {
                        let op = opStack.pop();
                        while (op.value !== '(') {
                            values.push(op);
                            op = opStack.pop();
                        }
                    }
                    break;
                case 'T_PUNCTUATOR_44': // ','
                    // ignoring of all commas
                    break;
                case END_SYMBOL:
                    break exit;
                default:
                    if (opPriors[token.value]) {
                        if (opStack.length) {
                            const thisOp = token.value;
                            const prevOp = opStack[opStack.length - 1].value;
                            assert(opPriors[prevOp] && opPriors[thisOp], prevOp, thisOp);
                            if (opPriors[prevOp] >= opPriors[thisOp]) {
                                values.push(opStack.pop());
                            }
                        }
                        opStack.push(token);
                        break;
                    }

                    this.emitMacroError(`unsupported macro operator found: '${token.value}'`, token.loc);
                    return NaN;
            }

            token = lexer.getNextToken();
        }

        while (opStack.length) {
            values.push(opStack.pop());
        }

        //
        // Evaluate reverse Polish notation
        //

        // FIXME: remove debug log
        const $input = `[${values.map(token => token.value).join(', ')}]`;

        const isOp = (op: IToken): boolean => isDef(opLogic[op.value]);
        const asOp = (op: IToken): IMacroFunc => opLogic[op.value];
        const isFn = (op: IToken): boolean => isDef(macroFuncs[op.value]);
        const asFn = (op: IToken): IMacroFunc => macroFuncs[op.value];

        const stack: IToken[] = [];
        values.forEach(token => {
            if (isOp(token)) {
                const { op, length } = asOp(token);
                stack.push(op(...stack.splice(-(length))));
                return;
            }
            if (isFn(token)) {
                const { op, length } = asFn(token);
                stack.push(op(...stack.splice(-(length))));
                return;
            }
            stack.push(token);
        });

        if (values.length === 1) {
            stack[0] = opLogic.asValue.op(stack[0]);
        }

        if (DEBUG_MACRO) console.log(`${$input} => {${stack[0].value}}`);
        // assert(asMacroNative(stack[0]) !== NaN, stack);

        return tokenToNative(stack[0]);
    }


    protected processErrorMacro(token: IToken): IToken {
        const text = this.readLine();
        const msg = text.value.trim();
        this.emitMacroError(`erroneous macro reached: "${msg}"`, util.commonRange(token.loc, text.loc));
        return this.readToken();
    }


    protected skipUnreachableCode(startToken: IToken): IToken {
        let token = this.readToken(false);
        let nesting = 0;

        while (token.name !== END_SYMBOL) {
            if (token.name === T_MACRO) {
                switch (token.value) {
                    case '#if':
                    case '#ifdef':
                    case '#ifndef':
                        nesting++;
                        break;
                    case '#elif':
                    case '#else':
                        if (nesting !== 0) {
                            break;
                        }

                    /* fall throught */
                    case '#endif':
                        if (nesting > 0) {
                            nesting--;
                            break;
                        }

                        this.addUnreachableCode(startToken, token);
                        return this.readMacro(token);
                    case '#error':
                        this.readLine();
                }
            }

            token = this.readToken(false);
        }

        // TODO: highlight open tag
        this.emitMacroError(`'endif' non found :/`, token.loc);
        return token;
    }


    protected addUnreachableCode(start: IToken, end: IToken): void {
        const block = { start: { ...start.loc.end, column: 0 }, end: { ...end.loc.end, column: 0 } };
        block.start.line++;

        if (block.end.line - block.start.line > 0) {
            if (DEBUG_MACRO) {
                console.log(`unreachable code: [${block.start.line}, ${block.end.line})`);
            }
            this.unreachableCodeList.push(block);
        }
    }


    protected processIncludeMacro(token: IToken): IToken {
        const file = this.readLine();
        //cuttin qoutes
        const includeURL = file.value.trim().slice(1, -1);
        const uri = URI.resolve(includeURL, `${token.loc.start.file}`);
        const loc = util.commonRange(token.loc, file.loc);

        if (this.includeMap.has(uri)) {
            if (DEBUG_MACRO) {
                const chain = this.includes.map(i => this.stack[i].lexer.document.uri.toString()).map(name => `\t> ${name}`).join('\n');
                console.warn(`'${uri}' file has already been included previously at "${this.includeMap.get(uri).start.file}":\n${chain}`);  
            }
           
            // TODO: prevent recursion!
            // // TODO: emit warning
            // return this.readToken();
        }

        try {

            const request = new XMLHttpRequest();
            request.open('GET', uri, false);
            request.send(null);

            if (request.status !== 200) {
                this.emitFileNotFound(uri, loc);
                return this.readToken();    
            }

            const source = request.responseText;

            // const response = fetch(uri);
            // if (!response.ok) {
            //     this.emitFileNotFound(uri, loc);
            //     return this.readToken();
            // }

            // const source = response.text();

            // TODO: use precise location (trimmed)
            this.pushDocument(createTextDocument(uri, source), loc, EPPDocumentFlags.k_Include);
        } catch (e) {
            console.error(e);
            this.emitFileNotFound(file.value, loc);
        }

        return this.readToken();
    }


    protected emitMacroWarning(msg: string, loc: IRange): void {
        this.diagnostics.warning(EPreprocessorWarnings.MacroUnknownWarning, { ...this.lexer.getPosition(), loc, msg });
    }


    protected emitMacroError(msg: string, loc: IRange): void {
        this.diagnostics.error(EPreprocessorErrors.MacroUnknownError, { ...this.lexer.getPosition(), loc, msg });
    }


    protected emitFileNotFound(file: string, loc: IRange) {
        this.diagnostics.error(EPreprocessorErrors.GeneralCouldNotReadFile, { ...this.lexer.getPosition(), loc, target: file });
    }


    protected applyMacro(token: IToken): IMacro {
        const macros = this.macros;
        const macro = macros.get(token.value);

        if (!macro) {
            return null;
        }

        if (macro.bFunction) {

            const $lexer = this.lexer;
            const pos = this.lexer.getPosition();

            const nextToken = this.readToken();
            if (nextToken.value !== '(') {
                this.emitMacroWarning(`for macro '${macro.name} function call signature is expected'`, token.loc);

                assert($lexer === this.lexer, 'something went wrong');
                this.lexer.setPosition(pos);
                return null;
            }

            let readTokens = [nextToken];
            let argRanges = <number[]>[];

            let argToken = this.readToken();
            let bracketDepth = 0;

            let startPos = 1;
            let endPos = 1;

            readTokens.push(argToken);
            while (argToken.name !== END_SYMBOL && !(argToken.value === ')' && bracketDepth == 0)) {
                switch (argToken.value) {
                    case '(':
                        bracketDepth++;
                        break;
                    case ')':
                        bracketDepth--;
                        break;
                    case ',':
                        if (bracketDepth === 0) {
                            assert(endPos - startPos > 0);
                            // TODO: emit error
                            if ((endPos - startPos) > 0) {
                                argRanges.push(startPos, endPos);
                            }
                            startPos = endPos + 1;
                        }
                        break;
                }

                endPos++;
                argToken = this.readToken();
                readTokens.push(argToken);
            }


            if (endPos > startPos) {
                argRanges.push(startPos, endPos);
            }

            const nArgs = argRanges.length / 2;

            if (nArgs !== macro.params.length) {
                this.emitMacroError(`macro '${macro.name}' arguments mismatch, expected count is ${macro.params.length} but recived ${nArgs}`, token.loc);

                assert($lexer === this.lexer, 'something went wrong');
                this.lexer.setPosition(pos);
                return null;
            }

            {
                const { loc: { start } } = token;
                const { loc: { end } } = argToken;
                this.pushDocument(macroToDocument(macro), { start, end }, EPPDocumentFlags.k_Macro, macro);
            }

            const params = macro.params;

            for (let i = 0; i < params.length; ++i) {
                const i2 = i * 2;

                const startPos = argRanges[i2];
                const endPos = argRanges[i2 + 1];
                const start = readTokens[startPos].loc.start;
                const end = readTokens[endPos - 1].loc.end;
                const value = readTokens.slice(startPos, endPos).map(t => t.value).join(' ');
                const macroToken = createMacroToken(value, { start, end });

                if (DEBUG_MACRO) {
                    console.log(`${macro.name}.${params[i]} => ${macroToken.value}`);
                }
                macros.set({
                    name: params[i],
                    text: macroToken,
                    bFunction: false,
                    params: null,
                    bRegionExpr: false
                });
            }
        } else {
            this.pushDocument(macroToDocument(macro), token.loc, EPPDocumentFlags.k_Macro, macro);
        }

        return macro;
    }

    protected preprocessToString(value: string): string {
        if (DEBUG_MACRO) {
            console.info('preprocess to string', value);
        }

        const pp = new Preprocessor(this.lexerEngine, this.knownTypes, this.macros, this.diagnostics);
        pp.setTextDocument(createTextDocument('://macro', value));

        let token = pp.readToken();
        let raw = null;
        while (token.name !== END_SYMBOL) {
            raw = (raw ? raw + ' ' : '') + token.value;
            token = pp.readToken();
        }

        if (DEBUG_MACRO) {
            console.info(`>> "${raw}"`);
        }

        return raw;
    }


    // apply "left'##'right" operator to value and next token
    protected applyConcatMacro(left: IToken): IToken {
        assert(!this.macros.get(left.value) || !this.macros.get(left.value).bFunction);

        const right = this.readToken(false, false);
        assert(right.name !== END_SYMBOL);

        if (DEBUG_MACRO) {
            console.info(`concat strings: "${left.value}##${right.value}"`);
        }

        const leftRaw = this.preprocessToString(left.value);
        const rightRaw = this.preprocessToString(right.value);
        const raw = `${leftRaw}${rightRaw}`;

        if (DEBUG_MACRO) {
            console.info(`=> "${leftRaw}${rightRaw}"`);
        }

        const loc = { start: left.loc.start, end: right.loc.end };

        // multiple concatenation processing: A ## B ## C ##  etc.
        const nextToken = this.readToken(false, false);
        if (nextToken.name === T_MACRO_CONCAT) {
            return this.applyConcatMacro(createMacroToken(raw, loc));
        }

        this.pushToken(nextToken);
        // we handle it as text document, because all possible macros inside are already resolved
        this.pushDocument(createTextDocument(this.lexer.document.uri, raw, left.loc.start), loc, EPPDocumentFlags.k_None);
        return this.readToken();
    }


    protected examMacro(token: IToken): IToken {
        const macroProcessing = this.stack[this.stack.length - 1].flags & EPPDocumentFlags.k_Macro;

        if (macroProcessing) {
            const nextToken = this.readToken(false, false);
            if (nextToken.name === T_MACRO_CONCAT) {
                return this.applyConcatMacro(token);
            }
            this.pushToken(nextToken);
        }

        if (token.name === T_NON_TYPE_ID || token.name === T_TYPE_ID) {
            const macro = this.applyMacro(token);
            if (macro) {
                return this.readToken();
            }
        }

        return token;
    }
}

// create preprocessed document
export function createPPDocument(textDocument: ITextDocument): ITextDocument {
    // TODO: try to use default lexer: new LexerEngine()

    const parser = defaultSLParser();
    const pp = new Preprocessor(parser.lexerEngine);
    pp.setTextDocument(textDocument);

    const newline = (from: number, to: number): string => Array(Math.min(to - from, 4)).fill('\n').join('');
    const padding = (length: number): string => Array(length).fill(' ').join('');
    
    let content = '';
    let tokenThis = pp.readToken();
    while (tokenThis.name !== END_SYMBOL) {
        const doPadding = !content || content.substr(-1) === '\n';
        const locThis = pp.macroLocation() || tokenThis.loc;
        const macroThis = pp.currentMacro();

        // padding
        if (doPadding) {
            content += padding(locThis.start.column);// + padding(tokenThis.loc.start.column);
            // note: paddings inside multiline macro are not supported
        }

        // place content
        content = `${content}${!doPadding ? ' ' : ''}${tokenThis.value}`;

        const tokenNext = pp.readToken();
        const locNext = pp.macroLocation() || tokenNext.loc;

        // newline if new file
        if (locThis.end.file !== locNext.start.file) {
            content += '\n\n';
        }
        // newline if new global macro (or just diff lines) on a new line
        else if (locThis.end.line < locNext.start.line) {
            content += newline(locThis.end.line, locNext.start.line);
        }
        // new line if it is a multiline macro
        else if (tokenThis.loc.end.line < tokenNext.loc.start.line && macroThis === pp.currentMacro()) {
            content += newline(tokenThis.loc.end.line, tokenNext.loc.start.line);
        }

        tokenThis = tokenNext;
    }

    return createTextDocument(textDocument.uri, content);
}
