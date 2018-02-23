import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Represent {stmts}
 * EMPTY_OPERATOR StmtInstruction ... StmtInstruction
 */
export class StmtBlockInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [];
        this._eInstructionType = EAFXInstructionTypes.k_StmtBlockInstruction;
    }

    toCode(): string {
        var sCode: string = "{" + "\n";

        for (var i: number = 0; i < this.instructions.length; i++) {
            sCode += "\t" + this._pInstructionList[i].toCode() + "\n";
        }

        sCode += "}";

        return sCode;
    }
}
