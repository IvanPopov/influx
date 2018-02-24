import { IStmtInstruction, EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IAnalyzedInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { Instruction } from "./Instruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent all kind of statements
 */
export class StmtInstruction extends Instruction implements IStmtInstruction {
    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_StmtInstruction) {
        super(pNode, eType);
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAnalyzedInstruction[] = <IAnalyzedInstruction[]>this.instructions;

        if (!isNull(pUsedDataCollector)) {
            for (var i: number = 0; i < this.instructions.length; i++) {
                pInstructionList[i].addUsedData(pUsedDataCollector, eUsedMode);
            }
        }
    }
}
