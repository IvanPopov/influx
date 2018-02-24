import { Instruction } from "./Instruction";
import { ITypedInstruction, ITypeInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export class TypedInstruction extends Instruction implements ITypedInstruction {
    protected _pType: ITypeInstruction;

    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_TypedInstruction) {
        super(pNode, eType);
        this._pType = null;
    }

    get type(): ITypeInstruction {
        return this._pType;
    }

    set type(pType: ITypeInstruction) {
        this._pType = pType;
    }
}
