import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent boolExpr && || boolExpr
 * (&& | ||) Instruction Instruction
 */
export class LogicalExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_LogicalExprInstruction);
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0].toCode();
        sCode += this.operator;
        sCode += this.instructions[1].toCode();
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst() &&
            (<IExprInstruction>this.instructions[1]).isConst() &&
            (<IExprInstruction>this.instructions[2]).isConst();
    }
}

