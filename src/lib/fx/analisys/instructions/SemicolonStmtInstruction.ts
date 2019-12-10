import { EInstructionTypes } from "@lib/idl/IInstruction";

import { IInstructionSettings } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";

/**
 * Represent empty statement only semicolon ;
 * ;
 */
export class SemicolonStmtInstruction extends StmtInstruction {
    
    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SemicolonStmt, ...settings });
    }

    toCode(): string {
        return ";";
    }
}
