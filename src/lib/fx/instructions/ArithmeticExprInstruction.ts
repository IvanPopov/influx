import { EInstructionTypes, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

export type ArithmeticOperator = "+" | "-" | "/" | "*" | "%";

export interface IArithmeticExprInstructionSettings extends IExprInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: ArithmeticOperator;
}


/**
 * Represent someExpr + / - * % someExpr
 * (+|-|*|/|%) Instruction Instruction
 */
export class ArithmeticExprInstruction extends ExprInstruction {
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;
    protected _operator: ArithmeticOperator;

    constructor({ left, right, operator, ...settings }: IArithmeticExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ArithmeticExprInstruction, ...settings });

        this._leftOperand = left.$withParent(this);
        this._rightOperand = right.$withParent(this);
        this._operator = operator;
    }

    get left(): IExprInstruction {
        return this._leftOperand;
    }

    get right(): IExprInstruction {
        return this._rightOperand;
    }

    get operator(): string {
        return this._operator;
    }
    

    evaluate(): boolean {
        var pValL: any = this._leftOperand.evaluate() ? this._leftOperand.getEvalValue() : null;
        var pValR: any = this._rightOperand.evaluate() ? this._rightOperand.getEvalValue() : null;

        if (isNull(pValL) || isNull(pValR)) {
            return false;
        }

        try {
            switch (this.operator) {
                case "+":
                    this._evalResult = pValL + pValR;
                    break;
                case "-":
                    this._evalResult = pValL - pValR;
                    break;
                case "*":
                    this._evalResult = pValL * pValR;
                    break;
                case "/":
                    this._evalResult = pValL / pValR;
                    break;
                case "%":
                    this._evalResult = pValL % pValR;
                    break;
            }
            return true;
        }
        catch (e) {
            return false;
        }
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this._leftOperand.toCode();
        sCode += this.operator;
        sCode += this._rightOperand.toCode();
        return sCode;
    }

    isConst(): boolean {
        return this.left.isConst() && this.right.isConst();
    }
}


