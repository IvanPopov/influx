import { EInstructionTypes, IExprInstruction, IVariableTypeInstruction, IInstruction, EVarUsedMode, IAnalyzedInstruction, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _pLastEvalResult: any;

    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_ExprInstruction) {
        super(pNode, eType);
        this._pLastEvalResult = null;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>super.type;
    }

    set type(pType: IVariableTypeInstruction) {
        super.type = pType;
    }

    evaluate(): boolean {
        return false;
    }

    simplify(): boolean {
        return false;
    }

    getEvalValue(): any {
        return this._pLastEvalResult;
    }

    isConst(): boolean {
        return false;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        (this.instructions as IAnalyzedInstruction[]).forEach((pInst) => pInst.addUsedData(pUsedDataCollector, eUsedMode));
    }
}
