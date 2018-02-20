import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EAFXInstructionTypes, EVarUsedMode, IAFXTypeUseInfoContainer, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represent someExpr = += -= /= *= %= someExpr
 * (=|+=|-=|*=|/=|%=) Instruction Instruction
 */
export class AssignmentExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null, null];
        this._eInstructionType = EAFXInstructionTypes.k_AssignmentExprInstruction;
    }

    _toFinalCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0]._toFinalCode();
        sCode += this.operator;
        sCode += this.instructions[1]._toFinalCode();
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var sOperator: string = this.operator;
        var pSubExprLeft: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[0];
        var pSubExprRight: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[1];

        if (eUsedMode === EVarUsedMode.k_Read || sOperator !== "=") {
            pSubExprLeft.addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
        }
        else {
            pSubExprLeft.addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
        }

        pSubExprRight.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }
}

