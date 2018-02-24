import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Reprsernt continue; break; discard;
 * (continue || break || discard) 
 */
export class BreakStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_BreakStmtInstruction);
    }

    // todo: validate operator's name
    toCode(): string {
        return this.operator + ";";
    }
}
