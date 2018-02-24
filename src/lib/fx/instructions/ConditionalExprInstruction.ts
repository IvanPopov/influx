import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represen boolExpr ? someExpr : someExpr
 * EMPTY_OPERATOR Instruction Instruction Instruction 
 */
export class ConditionalExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ConditionalExprInstruction);
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0].toCode();
        sCode += "?";
        sCode += this.instructions[1].toCode();
        sCode += ":";
        sCode += this.instructions[2].toCode();
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst() &&
            (<IExprInstruction>this.instructions[1]).isConst();
    }
}


