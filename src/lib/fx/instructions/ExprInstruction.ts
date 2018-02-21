import { EAFXInstructionTypes, IAFXExprInstruction, IAFXVariableTypeInstruction, IAFXInstruction, EVarUsedMode, IAFXAnalyzedInstruction, IAFXTypeUseInfoContainer } from "../../idl/IAFXInstruction";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

export class ExprInstruction extends TypedInstruction implements IAFXExprInstruction {
    protected _pLastEvalResult: any = null;

    /**
     * Respresent all kind of instruction
     */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._eInstructionType = EAFXInstructionTypes.k_ExprInstruction;
    }

    get type(): IAFXVariableTypeInstruction {
        return <IAFXVariableTypeInstruction>super.type;
    }

    set type(pType: IAFXVariableTypeInstruction) {
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

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXExprInstruction {
        return <IAFXExprInstruction>super.clone(pRelationMap);
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        (this.instructions as IAFXAnalyzedInstruction[]).forEach((pInst) => pInst.addUsedData(pUsedDataCollector, eUsedMode));
    }
}
