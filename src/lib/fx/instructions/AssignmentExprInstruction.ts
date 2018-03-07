import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { ITypedInstruction } from "./../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IExprInstruction, IInstruction, IAssignmentExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";


export interface IAssignmentExprInstructionSettings extends IExprInstructionSettings {
    left: ITypedInstruction;
    right: ITypedInstruction;
    operator: string;
}


/**
 * Represent someExpr = += -= /= *= %= someExpr
 * (=|+=|-=|*=|/=|%=) Instruction Instruction
 */
export class AssignmentExprInstruction extends ExprInstruction implements IAssignmentExprInstruction {
    protected _leftValue: ITypedInstruction;
    protected _rightValue: ITypedInstruction;
    protected _operator: string;

    constructor({ left, right, operator, ...settings }: IAssignmentExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_AssignmentExprInstruction, ...settings });

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
        var code: string = "";
        code += this.left.toCode();
        code += this.operator;
        code += this.right.toCode();
        return code;
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

