import { EInstructionTypes, IStmtInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";


/**
 * Represent all kind of statements
 */
export class StmtInstruction extends Instruction implements IStmtInstruction {
    
    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StmtInstruction, ...settings });
    }


    
}
