import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IPairedExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent someExpr == != < > <= >= someExpr
 * (==|!=|<|>|<=|>=) Instruction Instruction
 */
export class RelationalExprInstruction extends ExprInstruction implements IPairedExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_RelationalExprInstruction);
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
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.left).isConst() &&
            (<IExprInstruction>this.right).isConst();
    }
}


