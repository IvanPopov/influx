import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, IASTConfig, IASTDocument, IASTDocumentFlags } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors } from "@lib/parser/ASTDocument";
import { Lexer } from '@lib/parser/Lexer';
import * as uri from "@lib/uri/uri"

import { defaultSLParser } from './SLParser';

const readFile = fname => fetch(fname).then(resp => resp.text());


const PREDEFINED_TYPES = [
    'float2', 'float3', 'float4',
    'float2x2', 'float3x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4'
];

export class SLASTDocument extends ASTDocument {
    protected includeList: Set<string>;
    protected lexers: Lexer[];

    constructor({ parser = defaultSLParser() }: IASTConfig = {}) {
        super({ parser, knownTypes: new Set(PREDEFINED_TYPES) });
    }

    
    async parse(textDocument: ITextDocument, flags?: number): Promise<EParserCode> {
        this.includeList.add(textDocument.uri);
        return await super.parse(textDocument, flags);
    }


    protected init(config: IASTConfig) {
        super.init(config);

        this.includeList = new Set();
        this.lexers = [];
        this.ruleFunctions.set('addType', this._addType.bind(this));
        this.ruleFunctions.set('includeCode', this._includeCode.bind(this));
    }

    private _addType(): EOperationType {
        const tree = this.tree;
        const node = tree.lastNode;
        const typeId = node.children[node.children.length - 2].value;
        this.knownTypes.add(typeId);
        return EOperationType.k_Ok;
    }

    private async _includeCode(): Promise<EOperationType> {
        let tree = this.tree;
        let node = tree.lastNode;
        let file = node.value;

        //cuttin qoutes
        let includeURL = file.substr(1, file.length - 2);

        file = uri.resolve(includeURL, `${this.uri}`);

        if (this.includeList[file]) {
            return EOperationType.k_Ok;
        } 
        
        // let parserState = this._saveState();

        try {
            let content = await readFile(file);
            console.log(content);
            
            // parserState.source = parserState.source.substr(0, parserState.token.index) +
            // content + parserState.source.substr(parserState.token.index);

            // this.loadState(parserState);
            // this.addIncludedFile(file);
            // let result = await this.resumeParse();

            // return result == EParserCode.k_Ok? EOperationType.k_Ok : EOperationType.k_Error;
            return EOperationType.k_Ok;
        } catch (e) {
            this.diag.error(EParsingErrors.GeneralCouldNotReadFile, { ...this.lexer.getLocation(), loc: node.loc, target: file });
        }

        return EOperationType.k_Error;
    }
}


export async function createSLASTDocument(textDocument: ITextDocument, flags?: number): Promise<IASTDocument> {
    const document = new SLASTDocument();
    await document.parse(textDocument, flags);
    return document;
}
