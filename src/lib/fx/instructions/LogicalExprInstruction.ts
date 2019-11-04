import { EInstructionTypes, IExprInstruction, ILogicalExprInstruction, ILogicalOperator } from "@lib/idl/IInstruction";
import * as SystemScope from "@lib/fx/SystemScope";
import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";




export interface ILogicalExprInstructionSettings extends IInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: ILogicalOperator;
}


/**
 * Represent boolExpr && || boolExpr
 * (&& | ||) Instruction Instruction
 */
export class LogicalExprInstruction extends ExprInstruction implements ILogicalExprInstruction {
    protected _operator: ILogicalOperator;
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;

    constructor({ left, right, operator, ...settings }: ILogicalExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_LogicalExprInstruction, type: SystemScope.T_BOOL, ...settings });

        this._leftOperand = Instruction.$withParent(left, this);
        this._rightOperand = Instruction.$withParent(right, this);
        this._operator = operator;
    }


    get operator(): ILogicalOperator {
        return this._operator;
    }


    get left(): IExprInstruction {
        return this._leftOperand;
    }


    get right(): IExprInstruction {
        return this._rightOperand;
    }


    toCode(): string {
        var sCode: string = "";
        sCode += this.left.toCode();
        sCode += this.operator;
        sCode += this.right.toCode();
        return sCode;
    }

    
    isConst(): boolean {
        return (<IExprInstruction>this.left).isConst() &&
            (<IExprInstruction>this.right).isConst();
    }
}

