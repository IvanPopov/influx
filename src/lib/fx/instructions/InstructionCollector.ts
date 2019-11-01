import { Instruction, IInstructionSettings } from "./Instruction";
import { EInstructionTypes, IInstructionCollector, IInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export interface IInstructionCollectorSettings extends IInstructionSettings {
    instructions?: IInstruction[];
}

export class InstructionCollector extends Instruction implements IInstructionCollector {
    protected _instructions: IInstruction[];

    constructor({ instructions = [], ...settings }: IInstructionCollectorSettings) {
        super({ instrType: EInstructionTypes.k_InstructionCollector, ...settings });

        this._instructions = instructions;
    }


    get instructions(): IInstruction[] {
        return this._instructions;
    }

    push(instr: IInstruction): void {
        this._instructions.push(instr);
    }

    toCode(): string {
        let code = "";
        for (const instr of  this.instructions) {
            switch (instr.instructionType) {
                case EInstructionTypes.k_VariableDeclInstruction:
                    code += instr.toCode() + ';\n';
                break;
                default:
                    code += instr.toCode() + '\n';
            }
        }
        return code;
    }
}