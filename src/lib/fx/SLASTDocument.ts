import { EOperationType, IASTConfig, IASTDocument, IASTDocumentFlags } from '@lib/idl/parser/IParser';
import { ASTDocument } from "@lib/parser/ASTDocument";

import { defaultSLParser } from './SLParser';

// const readFile = fname => fetch(fname).then(resp => resp.text());


const PREDEFINED_TYPES = [
    'float2', 'float3', 'float4',
    'float2x2', 'float3x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4'
];

export class SLASTDocument extends ASTDocument {
    protected includeList: Set<string>;;

    constructor({ uri, source, flags = IASTDocumentFlags.k_Optimize, parser = defaultSLParser() }: IASTConfig) {
        super({ uri, source, flags, parser, knownTypes: new Set(PREDEFINED_TYPES) });
    }

    protected init(config: IASTConfig) {
        super.init(config);

        this.includeList = new Set([ this.uri ]);
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
        // let tree = this.getSyntaxTree();
        // let node = tree.lastNode;
        // let file = node.value;

        // //cuttin qoutes
        // let includeURL = file.substr(1, file.length - 2);

        // file = uri.resolve(includeURL, `${this.getUri()}`);

        // if (this.includeList[file]) {
        //     return EOperationType.k_Ok;
        // } 
        
        // let parserState = this._saveState();

        // try {
        //     let content = await readFile(file);
        //     parserState.source = parserState.source.substr(0, parserState.token.index) +
        //     content + parserState.source.substr(parserState.token.index);

        //     this.loadState(parserState);
        //     this.addIncludedFile(file);
        //     let result = await this.resumeParse();

        //     return result == EParserCode.k_Ok? EOperationType.k_Ok : EOperationType.k_Error;
        // } catch (e) {
        //     this.critical(EParserErrors.GeneralCouldNotReadFile, { target: file });
        // }

        return EOperationType.k_Error;
    }

    _saveState(): IASTDocument {
        // const state = super.saveState();
        // state.includeFiles = this.includeList;
        // return state;
        return this;
    }

    public _loadState(pState: IASTDocument): void {
        // super.loadState(pState);
        // this.includeList = <IMap<boolean>>pState["includeFiles"];
    }
}


export async function createSLASTDocument(config: IASTConfig): Promise<SLASTDocument> {
    const document = new SLASTDocument(config);
    await document.parse();
    return document;
}
