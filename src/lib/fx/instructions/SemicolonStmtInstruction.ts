import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent empty statement only semicolon ;
 * ;
 */
export class SemicolonStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_SemicolonStmtInstruction);
    }

    toCode(): string {
        return ";";
    }
}
