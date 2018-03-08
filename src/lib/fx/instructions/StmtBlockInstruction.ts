import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, IStmtBlockInstruction, IStmtInstruction, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";


export interface IStmtBlockInstructionSettings extends IInstructionSettings {
    instructions: IStmtInstruction[];
}


/**
 * Represent {stmts}
 * EMPTY_OPERATOR StmtInstruction ... StmtInstruction
 */
export class StmtBlockInstruction extends StmtInstruction implements IStmtBlockInstruction {
    protected _instructions: IStmtInstruction[];

    
    constructor({ instructions, ...settings }: IStmtBlockInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StmtBlockInstruction, ...settings });
        this._instructions = instructions;
    }


    get instructions(): IStmtInstruction[] {
        return this._instructions;
    }


    toCode(): string {
        var code: string = "{" + "\n";

        for (var i: number = 0; i < this.instructions.length; i++) {
            code += "\t" + this.instructions[i].toCode() + "\n";
        }

        code += "}";

        return code;
    }
}
