import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes } from "../../idl/IInstruction";

/**
 * Represent expr;
 * EMPTY_OPERTOR ExprInstruction 
 */
export class ExprStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ExprStmtInstruction);
    }

    toCode(): string {
        return this.instructions[0].toCode() + ';';
    }
}
