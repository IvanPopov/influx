import { assert, isDef, isNull, isString } from '@lib/common';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, ETokenType, IASTConfig, ILexerEngine, IParseNode, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors, EParsingWarnings, ParsingDiagnostics } from "@lib/parser/ASTDocument";
import { Lexer } from '@lib/parser/Lexer';
import { END_SYMBOL, T_MACRO_CONCAT, T_MACRO_TEXT, T_NON_TYPE_ID, T_TYPE_ID } from '@lib/parser/symbols';
import * as util from '@lib/parser/util';
import * as URI from "@lib/uri/uri";

import { defaultSLParser } from './SLParser';
import { createTextDocument } from './TextDocument';

// const readFile = fname => fetch(fname).then(resp => resp.text(), reason => console.warn('!!!', reason));

const PREDEFINED_TYPES = [
    'float2', 'float3', 'float4',
    'float2x2', 'float3x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4',
    'auto'
];

enum EMacroState {
    k_AllowElse,
    k_ForbidElse
};

const DEBUG_MACRO = true;


interface IMacro {
    name: string;
    bFunction: boolean;
    params: string[];
    text: IToken;
}


interface IMacroFunc {
    op: (...args: IToken[]) => IToken;
    length: number;
}


// as macro token
function createMacroToken(value: string, loc: IRange): IToken {
    assert(isString(value), value);
    return { index: -1, type: ETokenType.k_Unknown, name: 'T_MACRO', value, loc };
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

// function tokenToDocument(tokne: IToken): ITextDocument {

// }

function macroToDocument(macro: IMacro): ITextDocument {
    const source = macro.text.value;
    const uri = String(macro.text.loc.start.file);
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

class Macros {
    stack: Map<string, IMacro>[] = [new Map];
    push() {
        this.stack.push(new Map);
    }

    pop() {
        this.stack.pop();
    }

    set(macro: IMacro): void {
        this.stack[this.stack.length - 1].set(macro.name, macro);
    }

    get(name: string): IMacro {
        for (let i = this.stack.length - 1; i >= 0; --i) {
            const macros = this.stack[i];
            if (macros.has(name)) {
                return macros.get(name);
            }
        }
        return null;
    }

    has(name: string): boolean {
        return this.get(name) !== null;
    }

    forEach(cb: (value: IMacro) => void): void {
        let overrides = new Set;
        for (let i = this.stack.length - 1; i >= 0; --i) {
            const macros = this.stack[i];
            macros.forEach((macro) => {
                if (!overrides.has(macro.name)) {
                    overrides.add(macro.name);
                    cb(macro)
                }
            });
        }
    }
}


class Preprocessor {
    stack: { lexer: Lexer; tokens: IToken[], bMacro: boolean }[] = null;
    // diag: ParsingDiagnostics;

    macros: Macros;
    knownTypes: Set<string>;
    lexerEngine: ILexerEngine;

    constructor(lexerEngine: ILexerEngine, knownTypes: Set<string>, macros: Macros) {
        this.macros = macros;
        this.knownTypes = knownTypes;
        this.lexerEngine = lexerEngine;

        this.stack = [];
    }

    get lexer(): Lexer {
        return this.stack[this.stack.length - 1].lexer;
    }

    get tokens(): IToken[] {
        return this.stack[this.stack.length - 1].tokens;
    }

    push(textDocument: ITextDocument): void {
        this.pushLexer(textDocument);
    }

    pop(): void {
        this.popLexer();
    }

    getLocation() {
        return this.lexer.getLocation();
    }

    protected pushToken(...tokens: IToken[]): void {
        this.tokens.push(...tokens);
    }


    protected popToken(): IToken {
        return this.tokens.shift() || null;
    }


    protected pushLexer(textDocument: ITextDocument, bMacro = false): void {
        const lexer = new Lexer({ engine: this.lexerEngine, knownTypes: this.knownTypes });
        lexer.setup(textDocument);
        const tokens = <IToken[]>[];

        this.stack.push({ lexer, tokens, bMacro });

        if (bMacro) {
            this.macros.push();
        }
    }


    protected popLexer(): void {
        const { bMacro } = this.stack.pop();
        if (bMacro) {
            this.macros.pop();
        }
    }

    readLine(): IToken {
        return this.lexer.getNextLine();
    }

    isEmpty(): boolean {
        return this.stack.length === 0;
    }


    readToken(allowMacro: boolean = true, allowStateChanging = true): IToken {
        const token = this.popToken() || this.lexer.getNextToken();

        if (token.value === END_SYMBOL) {
            if (this.stack.length > 1 && allowStateChanging) {
                this.popLexer();
                return this.readToken(allowMacro);
            }

            // if (!this.macroState.isEmpty()) {
            //     // TODO: highlight open tag too.
            //     this.emitMacroError(`'endif' non found :/`, token.loc);
            // }

            return token; // END_SYMBOL
        }

        if (allowMacro) {
            return this.examMacro(token);
        }

        return token;
    }

    protected emitMacroWarning(msg: string, loc: IRange): void {
        console.warn(msg);
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
                        assert(endPos - startPos > 0);
                        // TODO: emit error
                        if ((endPos - startPos) > 0) {
                            argRanges.push(startPos, endPos);
                        }
                        startPos = endPos + 1;
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
                // TODO: emit error
                assert(false);

                assert($lexer === this.lexer, 'something went wrong');
                this.lexer.setPosition(pos);
                return null;
            }

            this.pushLexer(macroToDocument(macro), true);

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
                    params: null
                });
            }
        } else {
            this.pushLexer(macroToDocument(macro), true);
        }

        return macro;
    }

    protected examMacro(token: IToken): IToken {
        const bMacro = this.stack.length > 1 && this.stack[this.stack.length - 1].bMacro;

        if (bMacro) {
            const nextToken = this.readToken(false, false);
            if (nextToken.name === T_MACRO_CONCAT) {
                assert(!this.macros.get(token.value) || !this.macros.get(token.value).bFunction);

                const $pp = new Preprocessor(this.lexerEngine, this.knownTypes, this.macros);
                $pp.push(createTextDocument('://macro', token.value));

                let $tokens = <IToken[]>[];
                let $token = $pp.readToken();
                while ($token.name !== END_SYMBOL) {
                    $tokens.push($token);
                    $token = $pp.readToken();
                }

                // const left = token;
                const left = createMacroToken($tokens.map(t => t.value).join(' '), token.loc);
                const right = this.readToken();

                const combinedValue = `${left.value}${right.value}`;

                // // TODO: process with lexer
                // return <IToken>{
                //     type: ETokenType.k_IdentifierLiteral,
                //     name: T_NON_TYPE_ID, // use TYPE_ID too
                //     value: combinedValue,
                //     index: -1,
                //     loc: util.commonRange(left.loc, right.loc)
                // };
                this.pushLexer(createTextDocument(this.lexer.document.uri, combinedValue)); // bMacro = true? 
                return this.readToken();
            } else {
                this.pushToken(nextToken);
            }
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


export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    // TODO: remove it
    protected tokens: IToken[];

    protected preprocessor: Preprocessor;

    protected includeList: Map<string, IRange>;
    protected macros: Macros;
    protected macroState: MacroState;

    protected unreachableCodeList: IRange[];

    constructor({ parser = defaultSLParser() }: IASTConfig = {}) {
        super({ parser, knownTypes: new Set(PREDEFINED_TYPES) });
    }

    get includes(): Map<string, IRange> {
        return this.includeList;
    }

    get unreachableCode(): IRange[] {
        return this.unreachableCodeList;
    }

    async parse(textDocument: ITextDocument, flags?: number): Promise<EParserCode> {
        this.includeList.set(`${textDocument.uri}`, null);
        return await super.parse(textDocument, flags);
    }

    protected init(config: IASTConfig) {
        super.init(config);

        // this.lexers = [];
        this.tokens = [];

        this.includeList = new Map();
        this.macros = new Macros;
        this.macroState = new MacroState;
        this.unreachableCodeList = [];

        this.preprocessor = new Preprocessor(this.parser.lexerEngine, this.knownTypes, this.macros);

        this.ruleFunctions.set('addType', this._addType.bind(this));

        this.ruleFunctions.set('beginMacro', this._beginMacro.bind(this));
        this.ruleFunctions.set('endMacro', this._endMacro.bind(this));
    }


    private _addType(): EOperationType {
        const tree = this.tree;
        const node = tree.lastNode;
        const typeId = node.children[node.children.length - 2].value;
        this.knownTypes.add(typeId);
        return EOperationType.k_Ok;
    }


    protected emitFileNotFound(file: string, range: IRange) {
        // this.diag.error(EParsingErrors.GeneralCouldNotReadFile, { ...this.lexer.getLocation(), loc: range, target: file });
        this.diag.error(EParsingErrors.GeneralCouldNotReadFile, { ...this.preprocessor.getLocation(), loc: range, target: file });
    }


    protected emitMacroWarning(message: string, range: IRange) {
        // this.diag.warning(EParsingWarnings.MacroUnknownWarning, { ...this.lexer.getLocation(), loc: range, message });
        this.diag.warning(EParsingWarnings.MacroUnknownWarning, { ...this.preprocessor.getLocation(), loc: range, message });
    }


    protected emitMacroError(message: string, range: IRange) {
        // this.diag.error(EParsingErrors.MacroUnknownError, { ...this.lexer.getLocation(), loc: range, message });
        this.diag.error(EParsingErrors.MacroUnknownError, { ...this.preprocessor.getLocation(), loc: range, message });
    }


    protected emitMacroCritical(message: string, range: IRange) {
        // this.diag.critical(EParsingErrors.MacroUnknownError, { ...this.lexer.getLocation(), loc: range, message });
        this.diag.critical(EParsingErrors.MacroUnknownError, { ...this.preprocessor.getLocation(), loc: range, message });
    }


    /** @deprecated */
    protected pushToken(...tokens: IToken[]): void {
        this.tokens.push(...tokens);
    }


    /** @deprecated */
    protected popToken(): IToken {
        return this.tokens.shift() || null;
    }


    protected readToken(allowMacro: boolean = true): IToken {
        // TODO: remove it
        if (this.preprocessor.isEmpty()) {
            this.preprocessor.push(this.lexer.document);
        }

        const token = this.popToken() || this.preprocessor.readToken(allowMacro);

        if (token.value === END_SYMBOL) {
            if (!this.macroState.isEmpty()) {
                // TODO: highlight open tag too.
                this.emitMacroError(`'endif' non found :/`, token.loc);
            }
        }

        return token;
    }


    protected _beginMacro(): EOperationType {
        // const macroText = this.lexer.getNextLine();
        const macroText = this.preprocessor.readLine();
        macroText.name = T_MACRO_TEXT;
        this.pushToken(macroText);
        return EOperationType.k_Ok;
    }


    protected async _endMacro(): Promise<EOperationType> {
        let nodes = this.tree.nodes;
        let pound: IParseNode;
        let macroType: IParseNode;
        let args: IParseNode[];
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].value === '#') {
                [pound, macroType, ...args] = nodes.slice(i);
                break;
            }
        }

        assert(args.length === 1 && args[0].name === T_MACRO_TEXT);
        const [macroText] = args;

        if (DEBUG_MACRO) {
            console.log(`#${macroType.value} ${macroText.value}`);
        }

        switch (macroType.value) {
            case 'define': return this.processDefineMacro(macroType, macroText);
            case 'ifdef': return this.processIfdefMacro(macroType, macroText);
            case 'ifndef': return this.processIfndefMacro(macroType, macroText);
            case 'endif': return this.processEndifMacro(macroType);
            case 'else': return this.processElseMacro(macroType);
            case 'elif': return this.processElifMacro(macroType, macroText);
            case 'if': return this.processIfMacro(macroType, macroText);
            case 'error': return this.processErrorMacro(macroType, macroText);
            case 'include': return await this.processIncludeMacro(macroType, macroText);
            case 'pragma': return EOperationType.k_Ok;
        }

        this.emitMacroWarning(`unsupported macro type found: ${macroType.value}`, util.commonRange(pound.loc, macroType.loc, macroText.loc))
        return EOperationType.k_Ok;
    }


    protected processDefineMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const uri = macroText.loc.start.file;
        const source = macroText.value;
        const offset = macroText.loc.start;
        lexer.setup(createTextDocument(uri, source, offset));

        const name = lexer.getNextToken();
        const text = lexer.getNextLine();
        assert(name.name === T_NON_TYPE_ID);

        if (this.macros.has(name.value)) {
            this.emitMacroWarning(`macro redefinition found: ${name.value}`, name.loc);
        }

        const macro = this.processMacro(name, text);
        if (macro) {
            this.macros.set(macro);
        }

        return EOperationType.k_Ok;
    }

    protected processMacro(name: IToken, text: IToken): IMacro {
        let bFunction = false;
        let params: string[] = null;

        if (!/^\s*$/.test(text.value)) {

            //
            // process macro params
            //

            const lexer = new Lexer({ engine: this.parser.lexerEngine });
            const uri = this.uri;
            const source = text.value;
            const offset = text.loc.start;
            lexer.setup(createTextDocument(uri, source, offset));

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

        return { name: name.value, text, bFunction, params };
    }


    protected processIfdefMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        const { value, loc } = macroText;
        const exprValue = this.resolveDefMacro(createMacroToken(value, loc));

        if (exprValue) {
            this.macroState.push(EMacroState.k_ForbidElse);
            return EOperationType.k_Ok;
        }

        this.macroState.push(EMacroState.k_AllowElse);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processIfndefMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        const { value, loc } = macroText;
        const exprValue = this.resolveDefMacro(createMacroToken(value, loc));

        if (exprValue) {
            this.macroState.push(EMacroState.k_AllowElse);
            this.skipUnreachableCode();
            return EOperationType.k_Ok;
        }

        this.macroState.push(EMacroState.k_ForbidElse);
        return EOperationType.k_Ok;
    }


    protected processIfMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        const { value, loc } = macroText;

        if (this.resolveMacroInner(createMacroToken(value, loc))) {
            this.macroState.push(EMacroState.k_ForbidElse);
            return EOperationType.k_Ok;
        }

        this.macroState.push(EMacroState.k_AllowElse);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processElifMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        if (this.macroState.is(EMacroState.k_AllowElse)) {
            const { value, loc } = macroText;
            if (this.resolveMacroInner(createMacroToken(value, loc))) {
                this.macroState.replace(EMacroState.k_ForbidElse);
                return EOperationType.k_Ok;
            }
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processElseMacro(macroType: IParseNode): EOperationType {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        if (this.macroState.is(EMacroState.k_AllowElse)) {
            this.macroState.replace(EMacroState.k_ForbidElse);
            return EOperationType.k_Ok;
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processEndifMacro(macroType: IParseNode): EOperationType {
        if (!this.macroState.is(EMacroState.k_AllowElse) && !this.macroState.is(EMacroState.k_ForbidElse)) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        this.macroState.pop();
        return EOperationType.k_Ok;
    }


    protected resolveDefMacro(textToken: IToken): number {
        const macros = this.macros;

        // TODO: reuse precreated lexers
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const source = textToken.value;
        const offset = textToken.loc.start;
        const uri = textToken.loc.start.file;
        lexer.setup(createTextDocument(uri, source, offset));

        const asRaw = (token: IToken): number => tokenToNative(token, ({ value }) => macros.has(value) ? 1 : 0);
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
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const source = textToken.value;
        const offset = textToken.loc.start;
        const uri = textToken.loc.start.file;
        lexer.setup(createTextDocument(uri, source, offset));

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
            'defined': asFn((a: IToken) => macros.has(a.value)),
        };

        // TODO: move list construction to preprocess
        macros.forEach((macro: IMacro) => {
            if (macro.bFunction) {
                opPriors[macro.name] = 10;
                macroFuncs[macro.name] = {
                    op: (...args: IToken[]): IToken => {
                        macros.push();

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
                                params: null
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
                if (DEBUG_MACRO) console.log(`macro '${token.value}:${macro.text.value}' resolved to '${exprValue}''`);
                return exprValue;
            }

            this.emitMacroWarning(`cannot resolve macro '${token.value}'`, textToken.loc);
            return NaN;
        });
    }


    protected evaluateMacroExpr(lexer: Lexer,
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


    protected processErrorMacro(macroType: IParseNode, macroText: IParseNode): EOperationType {
        const msg = macroText.value.trim();
        this.emitMacroError(`erroneous macro reached: "${msg}"`,
            util.commonRange(macroType.loc, macroText.loc));
        return EOperationType.k_Ok;
    }


    protected skipUnreachableCode(): void {
        let token = this.readToken(false);
        let begin = token.loc.start;

        let nesting = 0;
        while (token.value !== END_SYMBOL) {
            if (token.value === '#') {
                let macro = this.readToken(false);

                switch (macro.value) {
                    case 'if':
                    case 'ifdef':
                    case 'ifndef':
                        nesting++;
                        break;
                    case 'elif':
                    case 'else':
                        if (nesting !== 0) {
                            break;
                        }
                    /* falls through */
                    case 'endif':
                        if (nesting > 0) {
                            nesting--;
                            break;
                        }

                        const block = { start: { ...begin, column: 0 }, end: { ...macro.loc.end, column: 0 } };
                        if (block.end.line - block.start.line > 0) {
                            if (DEBUG_MACRO) {
                                console.log(`unreachable code: [${block.start.line}, ${block.end.line})`);
                            }
                            this.unreachableCodeList.push(block);
                        }

                        // push back tokens in order to enable the parser to process 'endif' rule 
                        this.pushToken(token, macro);
                        return;
                    case 'error':
                        // this.lexer.getNextLine();
                        this.preprocessor.readLine();
                }
            }

            token = this.readToken(false);
        }

        // TODO: highlight open tag
        this.emitMacroError(`'endif' non found :/`, token.loc);
        this.pushToken(token);
    }


    protected async processIncludeMacro(macroType: IParseNode, macroText: IParseNode): Promise<EOperationType> {
        let file = macroText.value;
        //cuttin qoutes
        const includeURL = file.trim().slice(1, -1);
        const uri = URI.resolve(includeURL, `${this.uri}`);
        const loc = util.commonRange(macroType.loc, macroText.loc);

        if (this.includeList.has(uri)) {
            console.warn(`'${uri}' file has already been included previously.`);
            return EOperationType.k_Ok;
        }

        this.includeList.set(uri, loc);

        try {
            const response = await fetch(uri);
            if (!response.ok) {
                this.emitFileNotFound(uri, loc);
                return EOperationType.k_Error;
            }

            const source = await response.text();
            // this.pushLexer(createTextDocument(uri, source))
            this.preprocessor.push(createTextDocument(uri, source));

            return EOperationType.k_Ok;
        } catch (e) {
            console.error(e);
            this.emitFileNotFound(file, loc);
        }

        return EOperationType.k_Error;
    }
}


export async function createSLASTDocument(textDocument: ITextDocument, flags?: number): Promise<ISLASTDocument> {
    const document = new SLASTDocument();
    const timeLabel = `createSLASTDocument(${textDocument.uri})`;
    console.time(timeLabel);
    await document.parse(textDocument, flags);
    console.timeEnd(timeLabel);

    return document;
}
