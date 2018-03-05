import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, IInstruction, IExprInstruction } from "../../idl/IInstruction";

/**
 * Represent expr;
 * EMPTY_OPERTOR ExprInstruction 
 */
export class ExprStmtInstruction extends StmtInstruction {
    private _expr: IExprInstruction;

    constructor(pNode: IParseNode, expr: IExprInstruction) {
        super(pNode, EInstructionTypes.k_ExprStmtInstruction);
        
        this._expr = expr;
    }

    toCode(): string {
        return this._expr.toCode() + ';';
    }
}
