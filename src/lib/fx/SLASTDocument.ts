import { assert, isDef, isNull, isString } from '@lib/common';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, ETokenType, IASTConfig, IParseNode, IPosition, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors, EParsingWarnings } from "@lib/parser/ASTDocument";
import { Lexer } from '@lib/parser/Lexer';
import { END_SYMBOL, T_NON_TYPE_ID, T_TYPE_ID } from '@lib/parser/symbols';
import * as util from '@lib/parser/util';
import * as URI from "@lib/uri/uri";

import { defaultSLParser } from './SLParser';

// const readFile = fname => fetch(fname).then(resp => resp.text(), reason => console.warn('!!!', reason));

const PREDEFINED_TYPES = [
    'float2', 'float3', 'float4',
    'float2x2', 'float3x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4',
    'auto'
];

const ALLOW_ELSE_MACRO = true;
const FORBID_ELSE_MACRO = false;

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
function asMacroToken(value: string, loc: IRange): IToken {
    assert(isString(value), value);
    return { index: -1, type: ETokenType.k_Unknown, name: 'T_MACRO', value, loc };
}

const asMacroFunc = (fn: (...args: IToken[]) => number | boolean): IMacroFunc => {
    return {
        op: (...args: IToken[]): IToken => {
            const value = String(fn(...args));
            const loc = util.commonRange(...args.map(arg => arg.loc));
            return asMacroToken(value, loc);
        },
        length: fn.length
    };
}

function asTextDocument(macro: IMacro): ITextDocument {
    const source = macro.text.value;
    const uri = String(macro.text.loc.start.file);
    const offset = macro.text.loc.start;
    return { source, uri, offset };
}

function asMacroNative(token: IToken, fallback: (token: IToken) => number = () => NaN) {
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


export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    protected includeList: Map<string, IRange>;
    protected lexers: { lexer: Lexer; nextToken: IToken, source: 'macro' | 'include' | null }[];
    // NOTE: cached tokens (currently is being used only as macroText handler)
    protected tokens: IToken[];

    protected macros: Macros;
    protected macroState: boolean[]; // false => ignore all

    constructor({ parser = defaultSLParser() }: IASTConfig = {}) {
        super({ parser, knownTypes: new Set(PREDEFINED_TYPES) });
    }

    get includes(): Map<string, IRange> {
        return this.includeList;
    }

    async parse(textDocument: ITextDocument, flags?: number): Promise<EParserCode> {
        this.includeList.set(textDocument.uri, null);
        return await super.parse(textDocument, flags);
    }


    protected init(config: IASTConfig) {
        super.init(config);

        this.includeList = new Map();
        this.lexers = [];
        this.tokens = [];
        this.macros = new Macros;
        this.macroState = [];
        this.ruleFunctions.set('addType', this._addType.bind(this));
        this.ruleFunctions.set('includeCode', this._includeCode.bind(this));

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
        this.diag.error(EParsingErrors.GeneralCouldNotReadFile, { ...this.lexer.getLocation(), loc: range, target: file });
    }


    protected emitMacroWarning(message: string, range: IRange) {
        this.diag.warning(EParsingWarnings.MacroUnknownWarning, { ...this.lexer.getLocation(), loc: range, message });
    }


    protected emitMacroError(message: string, range: IRange) {
        this.diag.error(EParsingErrors.MacroUnknownError, { ...this.lexer.getLocation(), loc: range, message });
    }


    protected emitMacroCritical(message: string, range: IRange) {
        this.diag.critical(EParsingErrors.MacroUnknownError, { ...this.lexer.getLocation(), loc: range, message });
    }


    protected pushToken(...tokens: IToken[]): void {
        this.tokens.push(...tokens);
    }


    protected popToken(): IToken {
        return this.tokens.shift();
    }


    protected pushLexer(textDocument: ITextDocument, source: 'macro' = null): void {
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        lexer.setup(textDocument);
        this.lexers.push({ lexer: this.lexer, nextToken: null, source });
        this.lexer = lexer;
    }


    protected popLexer(): IToken {
        const { lexer, nextToken, source } = this.lexers.pop();

        // remove the macro if its source has ended
        if (source === 'macro') {
            this.macros.pop();
        }

        this.lexer = lexer;
        return nextToken;
    }


    protected examineMacro(token: IToken): IToken {
        if (token.name === T_NON_TYPE_ID || token.name === T_TYPE_ID) {
            const macros = this.macros;
            const macro = macros.get(token.value);

            if (macro) {
                macros.push();

                if (macro.bFunction) {
                    const nextToken = this.readToken();
                    if (nextToken.value !== '(') {
                        // TODO: emit warning
                        this.pushToken(nextToken);
                        return token;
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
                        this.pushToken(...readTokens);
                        return this.readToken();
                    }

                    const params = macro.params;

                    for (let i = 0; i < params.length; ++i) {
                        const i2 = i * 2;

                        const startPos = argRanges[i2];
                        const endPos = argRanges[i2 + 1];
                        const start = readTokens[startPos].loc.start;
                        const end = readTokens[endPos - 1].loc.end;
                        const value = readTokens.slice(startPos, endPos).map(t => t.value).join(' ');
                        const macroToken = asMacroToken(value, { start, end });

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
                }

                this.pushLexer(asTextDocument(macro), 'macro');
                return this.readToken();
            }
        }

        return token;
    }


    protected readToken(): IToken {
        if (this.tokens.length) {
            return this.popToken();
        }

        const token = super.readToken();
        if (token.value !== END_SYMBOL) {
            return this.examineMacro(token);
        }

        if (this.lexers.length) {
            return this.popLexer() || this.readToken();
        }

        if (this.macroState.length) {
            // TODO: highlight open tag too.
            this.emitMacroError(`'endif' non found :/`, token.loc);
        }

        return token; // END_SYMBOL
    }


    protected _beginMacro(): EOperationType {
        const macroText = this.lexer.getNextLine();
        macroText.name = 'MACRO_TEXT';
        this.pushToken(macroText);
        return EOperationType.k_Ok;
    }


    protected _endMacro(): EOperationType {
        let nodes = this.tree.nodes;
        let macroType: IParseNode;
        let args: IParseNode[];
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].value === '#') {
                [macroType, ...args] = nodes.slice(i + 1);
                break;
            }
        }

        switch (macroType.value) {
            case 'define': return this.processDefineMacro(macroType, args);
            case 'ifdef': return this.processIfdefMacro(macroType, args);
            case 'endif': return this.processEndifMacro(macroType);
            case 'else': return this.processElseMacro(macroType);
            case 'elif': return this.processElifMacro(macroType, args);
            case 'if': return this.processIfMacro(macroType, args);
            case 'error': return this.processErrorMacro(macroType, args);
            case 'pragma': return EOperationType.k_Ok;
        }

        console.warn(`unsupported macro type found: ${macroType}`);
        return EOperationType.k_Ok;
    }


    protected processDefineMacro(macroType: IParseNode, args: IParseNode[]): EOperationType {
        const [macroName, macroText] = args;

        if (this.macros.has(macroName.value)) {
            this.emitMacroWarning(`macro redefinition found: ${macroName.value}`, macroName.loc);
        }

        const macro = this.processMacro(macroName, macroText);
        if (macro) {
            this.macros.set(macro);
        }

        return EOperationType.k_Ok;
    }

    protected processMacro(macroName: IParseNode, macroText: IParseNode): IMacro {
        let bFunction = false;
        let params: string[] = null;
        let textToken = null;

        if (!/^\s*$/.test(macroText.value)) {
            textToken = asMacroToken(macroText.value, macroText.loc);
        }

        if (textToken) {

            //
            // process macro params
            //

            const lexer = new Lexer({ engine: this.parser.lexerEngine });
            const uri = this.uri;
            const source = macroText.value;
            const offset = macroText.loc.start;
            lexer.setup({ source, uri, offset });

            let token = lexer.getNextToken();
            if (token.name === 'T_PUNCTUATOR_40') { // '('
                params = [];
                bFunction = true;
                let bExpectComma = false;
                token = lexer.getNextToken();
                while (token.name !== END_SYMBOL && token.name !== 'T_PUNCTUATOR_41') { // ')'
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

                textToken = lexer.getNextLine();
            }
        }

        // console.log({ name: macroName.value, source: textToken, bFunction, params });
        return { name: macroName.value, text: textToken, bFunction, params };
    }

    protected processIfdefMacro(macroType: IParseNode, args: IParseNode[]): EOperationType {
        const macroText = args[0];
        const macros = this.macros;
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const uri = `${macroText.loc.start.file}`;
        const source = macroText.value;
        const offset = macroText.loc.start;
        lexer.setup({ source, uri, offset });

        const asRaw = (token: IToken): number => asMacroNative(token, ({ value }) => macros.has(value) ? 1 : 0);
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

        if (exprValue) {
            this.macroState.push(FORBID_ELSE_MACRO);
            return EOperationType.k_Ok;
        }

        this.macroState.push(ALLOW_ELSE_MACRO);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }



    protected processIfMacro(macroType: IParseNode, args: IParseNode[]): EOperationType {
        const { value, loc } = args[0];

        if (this.resolveMacroInner(asMacroToken(value, loc))) {
            this.macroState.push(FORBID_ELSE_MACRO);
            return EOperationType.k_Ok;
        }

        this.macroState.push(ALLOW_ELSE_MACRO);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processElifMacro(macroType: IParseNode, args: IParseNode[]): EOperationType {
        if (!this.macroState.length) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        const macroState = this.macroState[this.macroState.length - 1];

        if (macroState === ALLOW_ELSE_MACRO) {
            const { value, loc } = args[0];
            if (this.resolveMacroInner(asMacroToken(value, loc))) {
                return EOperationType.k_Ok;
            }
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processElseMacro(macroType: IParseNode): EOperationType {
        if (!this.macroState.length) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        const macroState = this.macroState[this.macroState.length - 1];

        if (macroState === ALLOW_ELSE_MACRO) {
            return EOperationType.k_Ok;
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }


    protected processEndifMacro(macroType: IParseNode): EOperationType {
        if (!this.macroState.length) {
            this.emitMacroError(`inappropriate control instruction found`, macroType.loc);
            return EOperationType.k_Ok;
        }

        this.macroState.pop();
        return EOperationType.k_Ok;
    }


    protected resolveMacroInner(textToken: IToken): number {
        // TODO: reuse precreated lexers
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const source = textToken.value;
        const offset = textToken.loc.start;
        const uri = `${textToken.loc.start.file}`;
        lexer.setup({ source, uri, offset });

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
            'defined': asFn((a: IToken) => macros.has(a.value)),
            'asValue': asValue
        };

        //
        // Wrap all macro functions to native 
        //

        const macroFuncs = <IMap<IMacroFunc>>{};
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
                        return asMacroToken(value, loc);
                    },

                    length: macro.params.length
                };
            }
        });

        return this.evaluateMacroExpr(lexer, opPriors, opLogic, macroFuncs);
    }


    protected resolveMacro(textToken: IToken): number {
        return asMacroNative(textToken, (token) => {
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
                case 'T_KW_DEFINED':
                    opStack.push(token);
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

        return asMacroNative(stack[0]);
    }


    protected processErrorMacro(macroType: IParseNode, args: IParseNode[]): EOperationType {
        const macroText = args[0];
        const msg = macroText.value.trim();
        this.emitMacroCritical(`erroneous macro reached: "${msg}"`,
            util.commonRange(macroType.loc, ...args.map(arg => arg.loc)));
        return EOperationType.k_Ok;
    }


    protected skipUnreachableCode() {
        let token = this.readToken();
        while (token.value !== END_SYMBOL && token.value !== '#') {
            token = this.readToken();
        }

        if (token.value === END_SYMBOL) {
            // TODO: highlight open tag
            this.emitMacroError(`'endif' non found :/`, token.loc);
        }

        this.pushToken(token);
    }


    protected async _includeCode(): Promise<EOperationType> {
        let tree = this.tree;
        let node = tree.lastNode;
        let file = node.value;

        //cuttin qoutes
        const includeURL = file.substr(1, file.length - 2);
        const uri = URI.resolve(includeURL, `${this.uri}`);

        if (this.includeList.has(uri)) {
            console.warn(`'${uri}' file has already been included previously.`);
            return EOperationType.k_Ok;
        }

        this.includeList.set(uri, node.loc);

        try {
            const response = await fetch(uri);

            if (!response.ok) {
                this.emitFileNotFound(uri, node.loc);
                return EOperationType.k_Error;
            }

            const source = await response.text();

            //
            // Replace lexer with new one 
            //

            this.lexers.push({ lexer: this.lexer, nextToken: this.token, source: 'include' });
            this.lexer = new Lexer({
                engine: this.parser.lexerEngine,
                knownTypes: this.knownTypes
            });
            this.lexer.setup({ source, uri });
            this.token = this.readToken();

            return EOperationType.k_Ok;
        } catch (e) {
            console.error(e);
            this.emitFileNotFound(file, node.loc);
        }

        return EOperationType.k_Error;
    }
}


export async function createSLASTDocument(textDocument: ITextDocument, flags?: number): Promise<ISLASTDocument> {
    const document = new SLASTDocument();
    await document.parse(textDocument, flags);
    return document;
}
