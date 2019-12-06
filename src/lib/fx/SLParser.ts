import { IMap } from "@lib/idl/IMap";
import { EOperationType, EParserType, EParsingFlags, IParseNode, IParser, IParserConfig, IParseTree } from '@lib/idl/parser/IParser';
import { EParserCode } from "@lib/idl/parser/IParser";
import { EParserErrors, Parser, ParserEngine } from "@lib/parser/Parser";
import * as uri from "@lib/uri/uri"
import { conf } from "@sandbox/containers/editor/hlsl";

const readFile = fname => fetch(fname).then(resp => resp.text());

export class SLParserEngine extends ParserEngine {
    protected init(grammar: string, flags: number, type: EParserType): boolean {
        if (!super.init(grammar, flags, type)) {
            return false;
        }
        this.addAdditionalFunction("addType");
        this.addAdditionalFunction("includeCode");
        return true;
    }
}


export class SLParser extends Parser {
    protected includeList: IMap<boolean> = null;

    constructor(config: IParserConfig) {
        super(config);

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

        this.includeList = <IMap<boolean>>{};
        this.addIncludedFile(`${this.getUri()}`);

        this.additionalFunctions['addType'] = this._addType.bind(this);
        this.additionalFunctions['includeCode'] = this._includeCode.bind(this);
    }

    protected addIncludedFile(filename: string): void {
        this.includeList[filename] = true;
    }

    private _addType(): EOperationType {
        let tree = this.getSyntaxTree();
        let node = tree.lastNode;
        let typeId = node.children[node.children.length - 2].value;

        this.addTypeId(typeId);
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

    _saveState(): IParser {
        // const state = super.saveState();
        // state.includeFiles = this.includeList;
        // return state;
        return this;
    }

    public _loadState(pState: IParser): void {
        // super.loadState(pState);
        // this.includeList = <IMap<boolean>>pState["includeFiles"];
    }
}

