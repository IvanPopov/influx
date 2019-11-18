import { EInstructionTypes, IExprInstruction, IReturnStmtInstruction, IReturnOperator } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";



export interface IReturnStmtInstructionSettings extends IInstructionSettings {
    expr?: IExprInstruction;
}



/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction implements IReturnStmtInstruction {
    protected _operator: IReturnOperator;
    protected _expr: IExprInstruction;

    constructor({ expr = null, ...settings }: IReturnStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ReturnStmt, ...settings });
        
        this._operator = "return";
        this._expr = Instruction.$withParent(expr, this);
    }

    
    get operator(): IReturnOperator {
        return this._operator;
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

