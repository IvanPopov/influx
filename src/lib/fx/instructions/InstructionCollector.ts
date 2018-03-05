import { Instruction } from "./Instruction";
import { EInstructionTypes, IInstructionCollector, IInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class InstructionCollector extends Instruction implements IInstructionCollector {
    protected _instructions: IInstruction[];

    constructor(instructions: IInstruction[]) {
        super(null, EInstructionTypes.k_InstructionCollector);

        this._instructions = instructions;
    }


    get instructions(): IInstruction[] {
        return this._instructions;
    }


    toCode(): string {
        var sCode: string = "";
        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
        }

        return sCode;
    }
}