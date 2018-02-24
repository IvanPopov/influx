import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IExprInstruction, IInstruction, IAssignmentExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represent someExpr = += -= /= *= %= someExpr
 * (=|+=|-=|*=|/=|%=) Instruction Instruction
 */
export class AssignmentExprInstruction extends ExprInstruction implements IAssignmentExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_AssignmentExprInstruction);
    }

    get left(): IInstruction {
        return this.instructions[0];
    }

    get right(): IInstruction {
        return this.instructions[1];
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

