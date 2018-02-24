import { EInstructionTypes, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { ExprInstruction } from "./ExprInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent someExpr + / - * % someExpr
 * (+|-|*|/|%) Instruction Instruction
 */
export class ArithmeticExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ArithmeticExprInstruction);
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    evaluate(): boolean {
        var pOperands: IExprInstruction[] = <IExprInstruction[]>this.instructions;
        var pValL: any = pOperands[0].evaluate() ? pOperands[0].getEvalValue() : null;
        var pValR: any = pOperands[1].evaluate() ? pOperands[1].getEvalValue() : null;

        if (isNull(pValL) || isNull(pValR)) {
            return false;
        }

        try {
            switch (this.operator) {
                case "+":
                    this._pLastEvalResult = pValL + pValR;
                    break;
                case "-":
                    this._pLastEvalResult = pValL - pValR;
                    break;
                case "*":
                    this._pLastEvalResult = pValL * pValR;
                    break;
                case "/":
                    this._pLastEvalResult = pValL / pValR;
                    break;
                case "%":
                    this._pLastEvalResult = pValL % pValR;
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
        sCode += this.instructions[0].toCode();
        sCode += this.operator;
        sCode += this.instructions[1].toCode();
        return sCode;
    }

    isConst(): boolean {
        var pOperands: IExprInstruction[] = <IExprInstruction[]>this.instructions;
        return pOperands[0].isConst() && pOperands[1].isConst();
    }
}


