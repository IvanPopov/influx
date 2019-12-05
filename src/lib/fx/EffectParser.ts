import { IMap } from "../idl/IMap";
import { EOperationType, EParsingFlags, IParseNode, IParserState, IParseTree } from '../idl/parser/IParser';
import { EParserErrors, Parser } from "../parser/Parser";
import * as uri from "../uri/uri"
import { EParserCode } from "./../idl/parser/IParser";

const readFile = fname => fetch(fname).then(resp => resp.text());

export class EffectParser extends Parser {
    private _includedFilesMap: IMap<boolean> = null;

    constructor() {
        super();

        this.addAdditionalFunction("addType", this._addType.bind(this));
        this.addAdditionalFunction("includeCode", this._includeCode.bind(this));
    }

    defaultInit(flags: EParsingFlags): void {
        super.defaultInit(flags);

        this.addTypeId("float2");
        this.addTypeId("float3");
        this.addTypeId("float4");

        this.addTypeId("float2x2");
        this.addTypeId("float3x3");
        this.addTypeId("float4x4");

        this.addTypeId("int2");
        this.addTypeId("int3");
        this.addTypeId("int4");

        this.addTypeId("uint2");
        this.addTypeId("uint3");
        this.addTypeId("uint4");

        this.addTypeId("bool2");
        this.addTypeId("bool3");
        this.addTypeId("bool4");

        this._includedFilesMap = <IMap<boolean>>{};
        this._includedFilesMap[`${this.getParseFileName()}`] = true;
    }

    protected addIncludedFile(filename: string): void {
        this._includedFilesMap[filename] = true;
    }

    private _addType(): EOperationType {
        let tree = this.getSyntaxTree();
        let node = tree.lastNode;
        let typeId = node.children[node.children.length - 2].value;

        this.addTypeId(typeId);
        return EOperationType.k_Ok;
    }

    private async _includeCode(): Promise<EOperationType> {
        let tree = this.getSyntaxTree();
        let node = tree.lastNode;
        let file = node.value;

        //cuttin qoutes
        let includeURL = file.substr(1, file.length - 2);

        file = uri.resolve(includeURL, `${this.getParseFileName()}`);

        if (this._includedFilesMap[file]) {
            return EOperationType.k_Ok;
        } 
        
        let parserState = this._saveState();

        try {
            let content = await readFile(file);
            parserState.source = parserState.source.substr(0, parserState.token.index) +
            content + parserState.source.substr(parserState.token.index);

            this.loadState(parserState);
            this.addIncludedFile(file);
            let result = await this.resumeParse();

            return result == EParserCode.k_Ok? EOperationType.k_Ok : EOperationType.k_Error;
        } catch (e) {
            this.critical(EParserErrors.GeneralCouldNotReadFile, { target: file });
        }

        return EOperationType.k_Error;
    }

    _saveState(): IParserState {
        const state = super.saveState();
        state.includeFiles = this._includedFilesMap;
        return state;
    }

    public _loadState(pState: IParserState): void {
        super.loadState(pState);
        this._includedFilesMap = <IMap<boolean>>pState["includeFiles"];
    }
}
