import { DeclInstruction } from "./DeclInstruction";
import { IAFXTypeDeclInstruction, EAFXInstructionTypes, IAFXTypeInstruction, IAFXInstruction, EAFXBlendMode } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class TypeDeclInstruction extends DeclInstruction implements IAFXTypeDeclInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_TypeDeclInstruction;
    }

    _getType(): IAFXTypeInstruction {
        return <IAFXTypeInstruction>this._pInstructionList[0];
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeDeclInstruction {
        return <IAFXTypeDeclInstruction>super._clone(pRelationMap);
    }

    _toFinalCode(): string {
        return this._getType()._toDeclString() + ";";
    }

    _getName(): string {
        return this._getType()._getName();
    }

    _getRealName(): string {
        return this._getType()._getRealName();
    }

    _blend(pDecl: IAFXTypeDeclInstruction, eBlendMode: EAFXBlendMode): IAFXTypeDeclInstruction {
        if (pDecl !== this) {
            return null;
        }

        return this;
    }
}
