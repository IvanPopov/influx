import { IStmtInstruction, EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IAnalyzedInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { Instruction } from "./Instruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";

/**
 * Represent all kind of statements
 */
export class StmtInstruction extends Instruction implements IStmtInstruction {
    constructor(node: IParseNode, type: EInstructionTypes = EInstructionTypes.k_StmtInstruction) {
        super(node, type);
    }


    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        usedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        console.error("@not_implemented");
    }
}
