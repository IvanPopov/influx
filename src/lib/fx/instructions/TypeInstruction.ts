import { DeclInstruction } from "./DeclInstruction";
import { IAFXTypeDeclInstruction, EAFXInstructionTypes, IAFXTypeInstruction, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class TypeDeclInstruction extends DeclInstruction implements IAFXTypeDeclInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_TypeDeclInstruction;
    }

    get type(): IAFXTypeInstruction {
        return <IAFXTypeInstruction>this._pInstructionList[0];
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeDeclInstruction {
        return <IAFXTypeDeclInstruction>super.clone(pRelationMap);
    }

    toCode(): string {
        return this.type.toDeclString() + ";";
    }

    get name(): string {
        return this.type.name;
    }

    get realName(): string {
        return this.type.realName;
    }
}
