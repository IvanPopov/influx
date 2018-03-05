import { Instruction } from "./Instruction";
import { ITypedInstruction, ITypeInstruction, EInstructionTypes, IInstruction, ITypeUseInfoContainer, EVarUsedMode } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * For example: 
 *      int x;
 *      int main();
 */

export class TypedInstruction extends Instruction implements ITypedInstruction {
    protected _type: ITypeInstruction;

    constructor(node: IParseNode, type: ITypeInstruction, instrType: EInstructionTypes = EInstructionTypes.k_TypedInstruction) {
        super(node, instrType);
        this._type = type;
    }

    get type(): ITypeInstruction {
        return this._type;
    }

    set type(type: ITypeInstruction) {
        this._type = type;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>, eUsedMode?: EVarUsedMode): void {
        console.error("@pure_virtual");
    }
}
