import { EOperationType } from "../akra/idl/parser/IParser";
import { Parser } from "../akra/parser/Parser"

export class EffectParser extends Parser {
    constructor() {
        super();
        this.addAdditionalFunction("addType", this._addType.bind(this));
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
    }

    _addType(): EOperationType {
        var pTree = this.getSyntaxTree();
        var pNode = pTree.getLastNode();
        var sTypeId;
        sTypeId = pNode.children[pNode.children.length - 2].value;
        this.addTypeId(sTypeId);
        return EOperationType.k_Ok;
    }
}

