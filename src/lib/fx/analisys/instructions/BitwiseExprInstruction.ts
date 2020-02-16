import { isNull } from "@lib/common";
import { EInstructionTypes, IBitwiseExprInstruction, IBitwiseOperator, IExprInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface IBitwiseExprInstructionSettings extends IExprInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: IBitwiseOperator;
}

/**
 * Represent someExpr >> << | & ^ someExpr
 * (>>,<<,|,&,^) Instruction Instruction
 */
export class BitwiseExprInstruction extends ExprInstruction implements IBitwiseExprInstruction {
    readonly left: IExprInstruction;
    readonly right: IExprInstruction;
    readonly operator: IBitwiseOperator;

    constructor({ left, right, operator, ...settings }: IBitwiseExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_BitwiseExpr, ...settings });

        this.left = Instruction.$withParent(left, this);
        this.right = Instruction.$withParent(right, this);
        this.operator = operator;
    }
    

    toCode(): string {
        return `${this.left.toCode()} ${this.operator} ${this.right.toCode()}`;
    }

    // FIXME: use isConstExpr instead!
    isConst(): boolean {
        return this.left.isConst() && this.right.isConst();
    }
}


