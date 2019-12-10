import { EInstructionTypes, IAssignmentExprInstruction, IExprInstruction, ITypedInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export type AssigmentOperator = "=" | "+=" | "-=" | "/=" | "*=" | "%=";

export interface IAssignmentExprInstructionSettings extends IInstructionSettings {
    left: IExprInstruction;
    right: ITypedInstruction;
    operator: AssigmentOperator;
}


/**
 * Represent someExpr = += -= /= *= %= someExpr
 * (=|+=|-=|*=|/=|%=) Instruction Instruction
 */
export class AssignmentExprInstruction extends ExprInstruction implements IAssignmentExprInstruction {
    protected _leftValue: IExprInstruction;
    protected _rightValue: ITypedInstruction;
    protected _operator: AssigmentOperator;

    constructor({ left, right, operator, ...settings }: IAssignmentExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_AssignmentExpr, type: left.type, ...settings });

        this._leftValue = Instruction.$withParent(left, this);
        this._rightValue = Instruction.$withParent(right, this);
        this._operator = operator;
    }

    get left(): IExprInstruction {
        return this._leftValue;
    }

    get right(): ITypedInstruction {
        return this._rightValue;
    }

    get operator(): string {
        return this._operator;
    }

    toCode(): string {
        var code: string = "";
        code += this.left.toCode();
        code += this.operator;
        code += this.right.toCode();
        return code;
    }
}

