import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";

/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_CastExprInstruction);
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this.instructions[0].toCode();
        sCode += "(";
        sCode += this.instructions[1].toCode();
        sCode += ")";
        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.instructions[1];
        pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[1]).isConst();
    }
}
