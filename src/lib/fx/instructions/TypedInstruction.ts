import { Instruction } from "./Instruction";
import { IAFXTypedInstruction, IAFXTypeInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export class TypedInstruction extends Instruction implements IAFXTypedInstruction {
    protected _pType: IAFXTypeInstruction;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pType = null;
        this._eInstructionType = EAFXInstructionTypes.k_TypedInstruction;
    }

    get type(): IAFXTypeInstruction {
        return this._pType;
    }

    set type(pType: IAFXTypeInstruction) {
        this._pType = pType;
    }

    _clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXTypedInstruction {
        var pClonedInstruction: IAFXTypedInstruction = <IAFXTypedInstruction>(super._clone(pRelationMap));
        if (!isNull(this.type)) {
            pClonedInstruction.type = this.type._clone(pRelationMap);
        }
        return pClonedInstruction;
    }
}
