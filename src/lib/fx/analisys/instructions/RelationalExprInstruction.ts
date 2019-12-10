import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import * as SystemScope from '@lib/fx/analisys/SystemScope';
import { EInstructionTypes, IExprInstruction, IRelationalExprInstruction } from "@lib/idl/IInstruction";

export type RelationOperator = "==" | "!=" | "<" | ">" | "<=" | ">=";

export interface IRelationalExprInstructionSettings extends IInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: RelationOperator;
}

/**
 * Represent someExpr == != < > <= >= someExpr
 * (==|!=|<|>|<=|>=) Instruction Instruction
 */
export class RelationalExprInstruction extends ExprInstruction implements IRelationalExprInstruction {
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;
    protected _operator: RelationOperator;


    constructor({ left, right, operator, ...settings }: IRelationalExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_RelationalExpr, type: SystemScope.T_BOOL, ...settings });
        this._leftOperand = left;
        this._rightOperand = right;
        this._operator = operator;
    }


    get left(): IExprInstruction {
        return this._leftOperand;
    }


    get right(): IExprInstruction {
        return this._rightOperand;
    }


    get operator(): RelationOperator {
        return this._operator;
    }


    toCode(): string {
        var code: string = '';
        code += this.left.toCode();
        code += this.operator;
        code += this.right.toCode();
        return code;
    }


    isConst(): boolean {
        return (<IExprInstruction>this.left).isConst() &&
            (<IExprInstruction>this.right).isConst();
    }
}


