import { Instruction } from "./Instruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";

export class InstructionCollector extends Instruction {
    constructor() {
        super();
        this._pInstructionList = [];
        this._eInstructionType = EAFXInstructionTypes.k_InstructionCollector;
    }

    _toFinalCode(): string {
        var sCode: string = "";
        for (var i: number = 0; i < this._nInstructions; i++) {
            sCode += this._getInstructions()[i]._toFinalCode();
        }

        return sCode;
    }
}