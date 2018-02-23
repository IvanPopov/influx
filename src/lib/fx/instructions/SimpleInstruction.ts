import { Instruction } from "./Instruction";
import { IAFXSimpleInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class SimpleInstruction extends Instruction implements IAFXSimpleInstruction {
    private _sValue: string = "";

    constructor(sValue: string, pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_SimpleInstruction;

        this._sValue = sValue;
    }

    set value(sValue: string) {
        this._sValue = sValue;
    }

    get value(): string {
        return this.value;
    }

    toString(): string {
        return this._sValue;
    }

    toCode(): string {
        return this._sValue;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): SimpleInstruction {
        var pClone: SimpleInstruction = <SimpleInstruction>super.clone(pRelationMap);
        pClone.value = (this._sValue);
        return pClone;
    }
}

