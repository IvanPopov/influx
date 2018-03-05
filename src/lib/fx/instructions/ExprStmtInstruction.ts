import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, IInstruction, IExprInstruction } from "../../idl/IInstruction";

/**
 * Represent expr;
 * EMPTY_OPERTOR ExprInstruction 
 */
export class ExprStmtInstruction extends StmtInstruction {
    protected _expr: IExprInstruction;

    constructor(node: IParseNode, expr: IExprInstruction) {
        super(node, EInstructionTypes.k_ExprStmtInstruction);
        
        this._expr = expr;
    }

    toCode(): string {
        return this._expr.toCode() + ';';
    }
}
