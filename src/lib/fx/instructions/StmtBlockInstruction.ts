import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Represent {stmts}
 * EMPTY_OPERATOR StmtInstruction ... StmtInstruction
 */
export class StmtBlockInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_StmtBlockInstruction);
    }

    toCode(): string {
        var sCode: string = "{" + "\n";

        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += "\t" + this.instructions[i].toCode() + "\n";
        }

        sCode += "}";

        return sCode;
    }
}
