import { assert, isBoolean, isDef, isString, isFunction, isNumber, isNull } from '@lib/common';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, IASTConfig, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors } from "@lib/parser/ASTDocument";
import { Lexer } from '@lib/parser/Lexer';
import { END_SYMBOL, T_NON_TYPE_ID } from '@lib/parser/symbols';
import * as URI from "@lib/uri/uri"

import { defaultSLParser } from './SLParser';
import { IMap } from '@lib/idl/IMap';

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



export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    protected includeList: Map<string, IRange>;
    protected lexers: { lexer: Lexer; nextToken: IToken }[];
    // NOTE: cached tokens (currently is being used only as macroText handler)
    protected tokens: IToken[];

    protected macroList: Map<string, string>;
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
        this.macroList = new Map;
        this.macroState = [];
        this.ruleFunctions.set('addType', this._addType.bind(this));
        this.ruleFunctions.set('includeCode', this._includeCode.bind(this));

        this.ruleFunctions.set('beginMacro', this._beginMacro.bind(this));
        this.ruleFunctions.set('endMacro', this._endMacro.bind(this));

        this.ruleFunctions.set('processIfdefMacro', this._processIfdefMacro.bind(this));
        this.ruleFunctions.set('processIfMacro', this._processIfMacro.bind(this));
        this.ruleFunctions.set('processElifMacro', this._processElifMacro.bind(this));
        this.ruleFunctions.set('processElseMacro', this._processElseMacro.bind(this));
        this.ruleFunctions.set('processEndifMacro', this._processEndifMacro.bind(this));

        // this.ruleFunctions.set('alt', this._allowLineTerminators.bind(this, true));
        // this.ruleFunctions.set('flt', this._allowLineTerminators.bind(this, false));
    }


    // private _allowLineTerminators(value: boolean): EOperationType {
    //     this.lexer.allowLineTerminators = value;
    //     return EOperationType.k_Ok;
    // }

    private _addType(): EOperationType {
        const tree = this.tree;
        const node = tree.lastNode;
        const typeId = node.children[node.children.length - 2].value;
        this.knownTypes.add(typeId);
        return EOperationType.k_Ok;
    }


    private emitFileNotFound(file: string, range: IRange) {
        this.diag.error(EParsingErrors.GeneralCouldNotReadFile, { ...this.lexer.getLocation(), loc: range, target: file });
    }


    protected readToken(): IToken {
        if (!this.tokens.length) {
            const token = super.readToken();
            if (token.value === END_SYMBOL) {
                if (this.lexers.length > 0) {
                    const { lexer, nextToken: cachedToken } = this.lexers.pop();
                    this.lexer = lexer;
                    return cachedToken;
                }
            }
            return token;
        }
        return this.tokens.shift();
    }


    protected _beginMacro(): EOperationType {
        const macroText = this.lexer.getNextLine();
        macroText.name = 'MACRO_TEXT';
        this.tokens.push(macroText);
        return EOperationType.k_Ok;
    }


    protected _endMacro(): EOperationType {
        // console.log(this.tree);

        let nodes = this.tree.nodes;

        let macroType = <string>null;
        let args: string[];
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].value === '#') {
                macroType = nodes[i + 1].name;
                args = nodes.slice(i + 2).map(node => node.value);
                break;
            }
        }

        switch (macroType) {
            case 'T_KW_DEFINE': return this._processDefineMacro(args);
            case 'T_KW_IFDEF': return this._processIfdefMacro(args);
            case 'T_KW_ENDIF': return this._processEndifMacro();
            case 'T_KW_ELSE': return this._processElseMacro();
            case 'T_KW_ELIF': return this._processElifMacro(args);
            case 'T_KW_IF': return this._processIfMacro(args);
        }

        console.warn(`unsupported macro type found: ${macroType}`);

        return EOperationType.k_Ok;
    }

    protected _processDefineMacro(args: string[]): EOperationType {
        let [name, source] = args;
        
        if (source.trim() === '') {
            source = null;
        }

        if (this.macroList.has(name)) {
            console.warn(`macro redefinition found: ${name}`);
        }

        this.macroList.set(name, source);

        return EOperationType.k_Ok;
    }


    protected _processIfdefMacro(args: string[]): EOperationType {
        const [source] = args;
        const macros = this.macroList;
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const uri = this.uri;
        lexer.setup({ source, uri });

        const opPriors = {
            '(': 1, ')': 1,
            '&&': 2,
            '||': 3,
            '!': 8
        };


        const asValue = (val): number => isString(val) ? (macros.has(val) ? 1 : 0) : val;

        const opLogic = {
            '&&': (a, b) => asValue(a) && asValue(b),
            '||': (a, b) => asValue(a) || asValue(b),
            '!': (a) => !asValue(a)
        };


        const exprValue = this.evaluateMacroExpr(lexer, opPriors, opLogic);
        console.log('result', exprValue);
        assert(exprValue === 1 || exprValue === 0);
        if (exprValue) {
            this.macroState.push(FORBID_ELSE_MACRO);
            return EOperationType.k_Ok;
        }

        this.macroState.push(ALLOW_ELSE_MACRO);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }



    protected _processIfMacro(args: string[]): EOperationType {
        const [source] = args;
        const lexer = new Lexer({ engine: this.parser.lexerEngine });
        const uri = this.uri;
        lexer.setup({ source, uri });

        if (this.resolveMacroInner(lexer)) {
            this.macroState.push(FORBID_ELSE_MACRO);
            return EOperationType.k_Ok;
        }

        this.macroState.push(ALLOW_ELSE_MACRO);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }

    protected _processElifMacro(args: string[]): EOperationType {
        const macroState = this.macroState[this.macroState.length - 1];

        if (macroState === ALLOW_ELSE_MACRO) {
            return this._processIfMacro(args);
            return EOperationType.k_Ok;
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }

    protected _processElseMacro(): EOperationType {
        const macroState = this.macroState[this.macroState.length - 1];

        if (macroState === ALLOW_ELSE_MACRO) {
            return EOperationType.k_Ok;
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }

    protected _processEndifMacro(): EOperationType {
        this.macroState.pop();

        return EOperationType.k_Ok;
    }


    protected resolveMacroInner(lexer: Lexer): number {
        const macros = this.macroList;
        const asValue = (val: string) => this.resolveMacro(val);

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
        const opLogic = {
            '&&': (a, b) => asValue(a) && asValue(b),
            '||': (a, b) => asValue(a) || asValue(b),
            '!': (a) => !asValue(a),
            '+': (a, b) => asValue(a) + asValue(b),
            '-': (a, b) => asValue(a) - asValue(b),
            '*': (a, b) => asValue(a) * asValue(b),
            '/': (a, b) => asValue(a) / asValue(b),
            '<': (a, b) => asValue(a) < asValue(b),
            '>': (a, b) => asValue(a) > asValue(b),
            '<=': (a, b) => asValue(a) <= asValue(b),
            '>=': (a, b) => asValue(a) >= asValue(b),
            '==': (a, b) => asValue(a) === asValue(b),
            '!=': (a, b) => asValue(a) !== asValue(b),
            'defined': (a) => macros.has(a),
            asValue
        };

        return this.evaluateMacroExpr(lexer, opPriors, opLogic);
    }


    protected resolveMacro(val: string): number {
        if (String(val) === 'true') {
            return 1;
        }

        if (String(val) === 'false') {
            return 0;
        }

        // TODO: replace this check
        if (String(Number(val)) === String(val)) {
            return Number(val);
        }

        let source = this.macroList.get(val);
        if (!isNull(source)) {
            let uri = this.uri;
            let lexer = new Lexer({});
            lexer.setup({ source, uri });

            const exprValue = this.resolveMacroInner(lexer);
            console.log(`macro '${val} resolved to '${exprValue}''`);
            return exprValue;
        }

        console.error(`cannot resolve macro '${val}'`);
        return NaN;
    }

    protected evaluateMacroExpr(lexer: Lexer, opPriors: IMap<number>, opLogic: IMap<Function>): number {
        const values = [];
        const stack = [];

        const readToken = () => lexer.getNextToken();
        let token = readToken();

        exit:
        while (true) {
            switch (token.name) {
                case 'T_NON_TYPE_ID':
                    values.push(token.value);
                    break;

                case 'T_UINT':
                case 'T_KW_TRUE':
                case 'T_KW_FALSE':
                    values.push(token.value);
                    break;
                case 'T_PUNCTUATOR_40': // '('
                    stack.push(token.value);
                    break;
                case 'T_PUNCTUATOR_41': // ')'
                    {
                        let op = stack.pop();
                        while (op !== '(') {
                            values.push(op);
                            op = stack.pop();
                        }
                    }
                    break;
                case END_SYMBOL:
                    break exit;
                case 'T_KW_DEFINED':
                    stack.push(token.value);
                    break;
                default:
                    if (opPriors[token.value]) {
                        if (stack.length) {
                            const thisOp = token.value;
                            const prevOp = stack[stack.length - 1];
                            assert(opPriors[prevOp] && opPriors[thisOp], prevOp, thisOp);
                            if (opPriors[prevOp] >= opPriors[thisOp]) {
                                values.push(stack.pop());
                            }
                        }
                        stack.push(token.value);
                        break;
                    }
                    assert(false);
                    // TODO: emit error
                    break exit;
            }

            token = readToken();
        }

        while (stack.length) {
            values.push(stack.pop());
        }

        console.log(values.join(', '));

        const isOp = (op: string): boolean => isDef(opPriors[op]);
        const asOp = (op: string): Function => opLogic[op];

        values.forEach(val => {
            if (isOp(val)) {
                const op = asOp(val);
                stack.push(op(...stack.splice(-op.length)));
                return;
            }
            stack.push(val);
        });

        if (values.length === 1) stack[0] = opLogic.asValue(stack[0]);

        assert(isNumber(stack[0]) || isBoolean(stack[0]));
        return Number(stack[0]);
    }


    protected skipUnreachableCode() {
        let token = this.readToken();
        while (token.value !== END_SYMBOL && token.value !== '#') {
            console.log('skip token >>', token.value);
            token = this.readToken();
        }

        if (token.value === END_SYMBOL) {
            // TODO: emit error
        }

        this.tokens.push(token);
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

            this.lexers.push({ lexer: this.lexer, nextToken: this.token });

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
