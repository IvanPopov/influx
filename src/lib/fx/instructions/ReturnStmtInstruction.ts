import { StmtInstruction } from "./StmtInstruction";
import { IExprInstruction } from "../../idl/IInstruction";
import { EInstructionTypes, EFunctionType, ITypedInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";

export type ReturnOperator = "return";

export interface IReturnStmtInstructionSettings extends IInstructionSettings {
    expr?: IExprInstruction;
}

/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction {
    protected _operator: ReturnOperator;
    protected _expr: IExprInstruction;

    constructor({ expr = null, ...settings }: IReturnStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ReturnStmtInstruction, ...settings });
        
        this._operator = "return";
        this._expr = Instruction.$withParent(expr, this);
    }


    get expr(): IExprInstruction {
        return this._expr;
    }


    toCode(): string {
        if (this.expr) {
            return "return " + this.expr.toCode() + ";";
        }
        else {
            return "return;";
        }
    }
}

