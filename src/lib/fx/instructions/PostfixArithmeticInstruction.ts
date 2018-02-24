import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";


/**
 * Represent someExpr ++
 * (-- | ++) Instruction
 */
export class PostfixArithmeticInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_PostfixArithmeticInstruction);
    }

    toCode(): string {
        var sCode: string = "";

        sCode += this.instructions[0].toCode();
        sCode += this.operator;

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.instructions[0];
        pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst();
    }
}

