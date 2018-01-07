import { Parser } from "../parser/Parser";
import { IMap } from "../idl/IMap";
import { EOperationType, IParseTree, IParseNode, IParserState } from '../idl/parser/IParser';
import * as uri from "../uri/uri"
import { logger } from "../logger";
import * as fs from "fs";

export class EffectParser extends Parser {
    private _pIncludedFilesMap: IMap<boolean> = null;

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

        this.addTypeId("bool2");
        this.addTypeId("bool3");
        this.addTypeId("bool4");

        this._pIncludedFilesMap = <IMap<boolean>>{};
        this._pIncludedFilesMap[this.getParseFileName()] = true;
    }

    _addIncludedFile(sFileName: string): void {
        this._pIncludedFilesMap[sFileName] = true;
    }

    private _addType(): EOperationType {
        let pTree: IParseTree = this.getSyntaxTree();
        let pNode: IParseNode = pTree.getLastNode();
        let sTypeId: string = pNode.children[pNode.children.length - 2].value;

        this.addTypeId(sTypeId);
        return EOperationType.k_Ok;
    }

    private _includeCode(): EOperationType {
        let pTree: IParseTree = this.getSyntaxTree();
        let pNode: IParseNode = pTree.getLastNode();
        let sFile: string = pNode.value;

        //cuttin qoutes
        let sIncludeURL: string = sFile.substr(1, sFile.length - 2);

        // if (uri.parse(this.getParseFileName()).getScheme() === "blob:") {

        //     sIncludeURL = deps.resolve(sIncludeURL, this.getParseFileName());
        // }

        sFile = uri.resolve(sIncludeURL, this.getParseFileName());

        if (this._pIncludedFilesMap[sFile]) {
            return EOperationType.k_Ok;
        }
        else {
            let pParserState: IParserState = this._saveState();

            fs.readFile(sFile, (err, data: Buffer) => {
                let sData = data.toString('utf8');

                if (err) {
                    logger.error(`Cannot read file: ${sFile}`);
                }
                else {
                    pParserState.source = pParserState.source.substr(0, pParserState.index) +
                        sData + pParserState.source.substr(pParserState.index);

                    this._loadState(pParserState);
                    this._addIncludedFile(sFile);
                    this.resume();
                }
            });

            return EOperationType.k_Pause;
        }
    }

    _saveState(): IParserState {
        let pState: IParserState = super._saveState();
        pState.includeFiles = this._pIncludedFilesMap;
        return pState;
    }

    public _loadState(pState: IParserState): void {
        super._loadState(pState);
        this._pIncludedFilesMap = <IMap<boolean>>pState["includeFiles"];
    }
}
