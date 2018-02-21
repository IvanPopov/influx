import { Instruction } from "./Instruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class InstructionCollector extends Instruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [];
        this._eInstructionType = EAFXInstructionTypes.k_InstructionCollector;
    }

    toCode(): string {
        var sCode: string = "";
        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
        }

        return sCode;
    }
}