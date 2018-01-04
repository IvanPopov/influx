import { Instruction } from "./Instruction";
import { IAFXSimpleInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";

export class SimpleInstruction extends Instruction implements IAFXSimpleInstruction {
    private _sValue: string = "";

    constructor(sValue: string) {
        super();
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_SimpleInstruction;

        this._sValue = sValue;
    }

    _setValue(sValue: string): void {
        this._sValue = sValue;
    }

    _isValue(sValue: string): boolean {
        return (this._sValue === sValue);
    }

    toString(): string {
        return this._sValue;
    }

    _toFinalCode(): string {
        return this._sValue;
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): SimpleInstruction {
        var pClone: SimpleInstruction = <SimpleInstruction>super._clone(pRelationMap);
        pClone._setValue(this._sValue);
        return pClone;
    }
}

