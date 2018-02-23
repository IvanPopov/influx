import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent while(expr) stmt
 * ( while || do_while) ExprInstruction StmtInstruction
 */
export class WhileStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null, null];
        this._eInstructionType = EAFXInstructionTypes.k_WhileStmtInstruction;
    }

    toCode(): string {
        var sCode: string = "";
        if (this.operator === "while") {
            sCode += "while(";
            sCode += this.instructions[0].toCode();
            sCode += ")";
            sCode += this.instructions[1].toCode();
        }
        else {
            sCode += "do";
            sCode += this.instructions[1].toCode();
            sCode += "while(";
            sCode += this.instructions[0].toCode();
            sCode += ");";
        }
        return sCode;
    }
}
