import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";


/**
 * Represent empty statement only semicolon ;
 * ;
 */
export class SemicolonStmtInstruction extends StmtInstruction {
    
    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SemicolonStmtInstruction, ...settings });
    }

    toCode(): string {
        return ';';
    }
}
