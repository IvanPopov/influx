import { EInstructionTypes, IExprInstruction, IVariableTypeInstruction, IInstruction, EVarUsedMode, IAnalyzedInstruction, ITypeUseInfoContainer, ITypeInstruction } from "../../idl/IInstruction";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _evalResult: any;

    constructor(node: IParseNode, type: ITypeInstruction, instrType: EInstructionTypes = EInstructionTypes.k_ExprInstruction) {
        super(node, type, instrType);
        this._evalResult = null;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>super.type;
    }

    evaluate(): boolean {
        return false;
    }

    getEvalValue(): any {
        return this._evalResult;
    }

    isConst(): boolean {
        return false;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>, eUsedMode?: EVarUsedMode) {
        console.log("@pure_virtual");
    }
}
