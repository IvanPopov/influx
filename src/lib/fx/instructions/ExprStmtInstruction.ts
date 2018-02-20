import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";

/**
 * Represent expr;
 * EMPTY_OPERTOR ExprInstruction 
 */
export class ExprStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_ExprStmtInstruction;
    }

    public _toFinalCode(): string {
        return this.instructions[0]._toFinalCode() + ';';
    }
}
