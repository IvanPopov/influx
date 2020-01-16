import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, IASTConfig, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors } from "@lib/parser/ASTDocument";
import { Lexer } from '@lib/parser/Lexer';
import { END_SYMBOL } from '@lib/parser/symbols';
import * as URI from "@lib/uri/uri"

import { defaultSLParser } from './SLParser';
import { assert } from '@lib/common';

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

    protected macroList: Set<string>;
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
        this.macroList = new Set;
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


    private _beginMacro(): EOperationType {
        const macroText = this.lexer.getNextLine();
        macroText.name = 'MACRO_TEXT';
        this.tokens.push(macroText);
        return EOperationType.k_Ok;
    }


    private _endMacro(): EOperationType  {
        // console.log(this.tree);

        let nodes = this.tree.nodes;

        let macroType = <string>null;
        let args: string[];
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].value === '#') {
                macroType = nodes[i + 1].name;
                args  = nodes.slice(i + 2).map(node => node.value);
                break;
            }
        }

        switch(macroType) {
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

    private _processDefineMacro(args: string[]): EOperationType {
        let [ name, value ] = args;

        if (this.macroList.has(name)) {
            console.warn(`macro redefinition found: ${name}`);
        } else {
            this.macroList.add(name);
        }

        return EOperationType.k_Ok;
    }


    private _processIfdefMacro(args: string[]): EOperationType  {
        let [ value ] = args;

        let identifier = value.trim();

        assert(identifier.split(' ').length === 1, 'todo');

        if (this.macroList.has(identifier)) {
            this.macroState.push(FORBID_ELSE_MACRO);
            return EOperationType.k_Ok;
        }

        this.macroState.push(ALLOW_ELSE_MACRO);
        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }



    private _processIfMacro(args: string[]): EOperationType  {
        console.log('process if macro');
        return EOperationType.k_Ok;
    }

    private _processElifMacro(args: string[]): EOperationType  {
        console.log('process elif macro');
        return EOperationType.k_Ok;
    }

    private _processElseMacro(): EOperationType  {
        const macroState = this.macroState[this.macroState.length - 1];

        if (macroState === ALLOW_ELSE_MACRO) {
            return EOperationType.k_Ok;
        }

        this.skipUnreachableCode();
        return EOperationType.k_Ok;
    }

    private _processEndifMacro(): EOperationType  {
        this.macroState.pop();

        return EOperationType.k_Ok;
    }

    private skipUnreachableCode() {
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

    private async _includeCode(): Promise<EOperationType> {
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
