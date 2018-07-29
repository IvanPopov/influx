import { StmtInstruction } from "./StmtInstruction";
import { IInstructionSettings } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";
import { EInstructionTypes, IInstruction, IExprInstruction } from "../../idl/IInstruction";


export interface IExprStmtInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
}

/**
 * Represent expr;
 * EMPTY_OPERTOR ExprInstruction 
 */
export class ExprStmtInstruction extends StmtInstruction {
    protected _expr: IExprInstruction;

    constructor({ expr, ...settings }: IExprStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ExprStmtInstruction, ...settings });

        this._expr = expr.$withParent(this);
    }

    get expr(): IExprInstruction {
        return this._expr;
    }

    toCode(): string {
        return this._expr.toCode() + ';';
    }
}
