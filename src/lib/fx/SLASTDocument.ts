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

export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    protected includeList: Map<string, IRange>;
    protected lexers: { lexer: Lexer; nextToken: IToken }[];
    // NOTE: cached tokens (currently is being used only as macroText handler)
    protected tokens: IToken[];

    protected macroList: Set<string>;

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
        this.ruleFunctions.set('addType', this._addType.bind(this));
        this.ruleFunctions.set('includeCode', this._includeCode.bind(this));

        this.ruleFunctions.set('beginMacro', this._beginMacro.bind(this));
        this.ruleFunctions.set('endMacro', this._endMacro.bind(this));
        
        this.ruleFunctions.set('processIfdefMacro', this._processIfdefMacro.bind(this));
        this.ruleFunctions.set('processIfMacro', this._processIfMacro.bind(this));
        this.ruleFunctions.set('processElifMacro', this._processElifMacro.bind(this));
        this.ruleFunctions.set('processElseMacro', this._processElseMacro.bind(this));
        this.ruleFunctions.set('processEndifMacro', this._processEndifMacro.bind(this));
    }

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


    private async _beginMacro(): Promise<EOperationType> {
        let macroName = this.token;
        let macroText = this.lexer.getNextLine();
        macroText.name = 'MACRO_TEXT';
        console.log(macroName.value, macroText.value);
        this.tokens.push(macroText);

        if (this.macroList.has(macroName.value)) {
            console.warn(`macro redefinition found: ${macroName.value}`);
        } else {
            this.macroList.add(macroName.value);
        }

        return EOperationType.k_Ok;
    }


    private async _endMacro(): Promise<EOperationType>  {

        return EOperationType.k_Ok;
    }


    private _processIfdefMacro(): EOperationType  {
        console.log('process ifdef macro');
        
        let tree = this.tree;
        const definedExpr = tree.lastNode;

        assert(definedExpr.children.length === 1, 'todo');

        let macroId = definedExpr.children[0].value;

        if (this.macroList.has(macroId)) {
            return EOperationType.k_Ok;
        }

        let token = this.readToken();
        while (token && token.value !== '#') {
            token = this.readToken();
        }

        // this.tokens.push(token);
        this.token = token;
        return EOperationType.k_Ok;
    }

    private _processIfMacro(): EOperationType  {
        console.log('process if macro');
        return EOperationType.k_Ok;
    }

    private _processElifMacro(): EOperationType  {
        console.log('process elif macro');
        return EOperationType.k_Ok;
    }

    private _processElseMacro(): EOperationType  {
        console.log('process else macro');
        return EOperationType.k_Ok;
    }

    private _processEndifMacro(): EOperationType  {
        console.log('process endif macro');

        return EOperationType.k_Ok;
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
