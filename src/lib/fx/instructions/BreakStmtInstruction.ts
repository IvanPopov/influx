import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Reprsernt continue; break; discard;
 * (continue || break || discard) 
 */
export class BreakStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_BreakStmtInstruction;
    }

    toCode(): string {
        return this.operator + ";";
    }
}
