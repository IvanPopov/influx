import { Parser, EParserErrors } from "../parser/Parser";
import { EParserCode } from "./../idl/parser/IParser";
import { IMap } from "../idl/IMap";
import { EOperationType, IParseTree, IParseNode, IParserState } from '../idl/parser/IParser';
import * as uri from "../uri/uri"

const readFile = fname => fetch(fname).then(resp => resp.text());

export class EffectParser extends Parser {
    private _includedFilesMap: IMap<boolean> = null;

    constructor() {
        super();

        this.addAdditionalFunction("addType", this._addType.bind(this));
        this.addAdditionalFunction("includeCode", this._includeCode.bind(this));
    }

    defaultInit(): void {
        super.defaultInit();

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
        let node = tree.getLastNode();
        let typeId = node.children[node.children.length - 2].value;

        this.addTypeId(typeId);
        return EOperationType.k_Ok;
    }

    private async _includeCode(): Promise<EOperationType> {
        let tree = this.getSyntaxTree();
        let node = tree.getLastNode();
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
            parserState.source = parserState.source.substr(0, parserState.index) +
            content + parserState.source.substr(parserState.index);

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
        let pState: IParserState = super.saveState();
        pState.includeFiles = this._includedFilesMap;
        return pState;
    }

    public _loadState(pState: IParserState): void {
        super.loadState(pState);
        this._includedFilesMap = <IMap<boolean>>pState["includeFiles"];
    }
}
