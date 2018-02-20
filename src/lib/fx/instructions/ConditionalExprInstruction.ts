import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EAFXInstructionTypes, EVarUsedMode, IAFXTypeUseInfoContainer, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represen boolExpr ? someExpr : someExpr
 * EMPTY_OPERATOR Instruction Instruction Instruction 
 */
export class ConditionalExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null, null, null];
        this._eInstructionType = EAFXInstructionTypes.k_ConditionalExprInstruction;
    }

    _toFinalCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0]._toFinalCode();
        sCode += "?";
        sCode += this.instructions[1]._toFinalCode();
        sCode += ":";
        sCode += this.instructions[2]._toFinalCode();
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IAFXExprInstruction>this.instructions[0]).isConst() &&
            (<IAFXExprInstruction>this.instructions[1]).isConst();
    }
}


