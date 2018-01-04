import { IAFXStmtInstruction, EAFXInstructionTypes, EVarUsedMode, IAFXTypeUseInfoContainer, IAFXAnalyzedInstruction } from "../../idl/IAFXInstruction";
import { Instruction } from "./Instruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent all kind of statements
 */
export class StmtInstruction extends Instruction implements IAFXStmtInstruction {
    constructor() {
        super();
        this._eInstructionType = EAFXInstructionTypes.k_StmtInstruction;
    }

    _addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAFXAnalyzedInstruction[] = <IAFXAnalyzedInstruction[]>this._getInstructions();

        if (!isNull(pUsedDataCollector)) {
            for (var i: number = 0; i < this._nInstructions; i++) {
                pInstructionList[i]._addUsedData(pUsedDataCollector, eUsedMode);
            }
        }
    }
}
