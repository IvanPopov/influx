import { EInstructionTypes, IExprInstruction, IVariableTypeInstruction, IInstruction, EVarUsedMode, IAnalyzedInstruction, ITypeUseInfoContainer, ITypeInstruction } from "../../idl/IInstruction";
import { TypedInstruction, ITypedInstructionSettings } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export interface IExprInstructionSettings extends ITypedInstructionSettings {
    
}

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _evalResult: any;

    constructor({ ...settings }: IExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ExprInstruction, ...settings });
        this._evalResult = null;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>super.type;
    }

    evaluate(): boolean {
        console.error("@pure_virtual");
        return false;
    }

    getEvalValue(): any {
        return this._evalResult;
    }

    isConst(): boolean {
        console.error("@pure_virtual");
        return false;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>, eUsedMode?: EVarUsedMode) {
        console.error("@pure_virtual");
    }
}
