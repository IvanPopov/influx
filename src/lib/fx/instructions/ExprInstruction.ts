import { EAFXInstructionTypes, IAFXExprInstruction, IAFXVariableTypeInstruction, IAFXInstruction, EVarUsedMode, IAFXAnalyzedInstruction, IAFXTypeUseInfoContainer } from "../../idl/IAFXInstruction";
import { TypedInstruction } from "./TypedInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

export class ExprInstruction extends TypedInstruction implements IAFXExprInstruction {
    protected _pLastEvalResult: any = null;

    /**
     * Respresent all kind of instruction
     */
    constructor() {
        super();
        this._eInstructionType = EAFXInstructionTypes.k_ExprInstruction;
    }

    _evaluate(): boolean {
        return false;
    }

    _simplify(): boolean {
        return false;
    }

    _getEvalValue(): any {
        return this._pLastEvalResult;
    }

    _isConst(): boolean {
        return false;
    }

    _getType(): IAFXVariableTypeInstruction {
        return <IAFXVariableTypeInstruction>super._getType();
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXExprInstruction {
        return <IAFXExprInstruction>super._clone(pRelationMap);
    }

    _addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAFXAnalyzedInstruction[] = <IAFXAnalyzedInstruction[]>this._getInstructions();

        if (isNull(pInstructionList)) {
            return;
        }

        for (var i: number = 0; i < this._nInstructions; i++) {
            pInstructionList[i]._addUsedData(pUsedDataCollector, eUsedMode);
        }
    }
}
