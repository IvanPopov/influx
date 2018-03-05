import { ExprInstruction } from "./ExprInstruction";
import { ITypedInstruction } from "./../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IExprInstruction, IInstruction, IAssignmentExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represent someExpr = += -= /= *= %= someExpr
 * (=|+=|-=|*=|/=|%=) Instruction Instruction
 */
export class AssignmentExprInstruction extends ExprInstruction implements IAssignmentExprInstruction {
    private _leftValue: ITypedInstruction;
    private _rightValue: ITypedInstruction;
    private _operator: string;

    constructor(node: IParseNode, left: ITypedInstruction, right: ITypedInstruction, operator: string) {
        super(node, left.type, EInstructionTypes.k_AssignmentExprInstruction);

        this._leftValue = left;
        this._rightValue = right;
        this._operator = operator;
    }

    get left(): IInstruction {
        return this._leftValue;
    }

    get right(): IInstruction {
        return this._rightValue;
    }

    get operator(): string {
        return this._operator;
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this.left.toCode();
        sCode += this.operator;
        sCode += this.right.toCode();
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var sOperator: string = this.operator;
        var pSubExprLeft: IExprInstruction = <IExprInstruction>this.left;
        var pSubExprRight: IExprInstruction = <IExprInstruction>this.right;

        if (eUsedMode === EVarUsedMode.k_Read || sOperator !== "=") {
            pSubExprLeft.addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
        }
        else {
            pSubExprLeft.addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
        }

        pSubExprRight.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }
}

