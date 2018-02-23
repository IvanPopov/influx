import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXTypeUseInfoContainer, EVarUsedMode, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent someExpr == != < > <= >= someExpr
 * (==|!=|<|>|<=|>=) Instruction Instruction
 */
export class RelationalExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null, null];
        this._eInstructionType = EAFXInstructionTypes.k_RelationalExprInstruction;
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0].toCode();
        sCode += this.operator;
        sCode += this.instructions[1].toCode();
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


