import { Instruction } from "./Instruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class InstructionCollector extends Instruction {
    constructor() {
        super(null, EInstructionTypes.k_InstructionCollector);
    }

    toCode(): string {
        var sCode: string = "";
        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
        }

        return sCode;
    }
}