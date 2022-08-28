import { isNull } from "@lib/common";
import { EInstructionTypes, IArithmeticExprInstruction, IArithmeticOperator, IExprInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface IArithmeticExprInstructionSettings extends IExprInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: IArithmeticOperator;
}


/**
 * Represent someExpr + / - * % someExpr
 * (+|-|*|/|%) Instruction Instruction
 */
export class ArithmeticExprInstruction extends ExprInstruction implements IArithmeticExprInstruction {
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;
    protected _operator: IArithmeticOperator;

    constructor({ left, right, operator, ...settings }: IArithmeticExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ArithmeticExpr, ...settings });

        this._leftOperand = Instruction.$withParent(left, this);
        this._rightOperand = Instruction.$withParent(right, this);
        this._operator = operator;
    }

    get left(): IExprInstruction {
        return this._leftOperand;
    }

    get right(): IExprInstruction {
        return this._rightOperand;
    }

    get operator(): IArithmeticOperator {
        return this._operator;
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this._leftOperand.toCode();
        sCode += ` ${this.operator} `;
        sCode += this._rightOperand.toCode();
        return sCode;
    }

    isConst(): boolean {
        return this.left.isConst() && this.right.isConst();
    }
}


