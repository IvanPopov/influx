import { Instruction, IInstructionSettings } from "./Instruction";
import { ITypedInstruction, ITypeInstruction, EInstructionTypes, IInstruction, ITypeUseInfoContainer, EVarUsedMode } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";


export interface ITypedInstructionSettings extends IInstructionSettings {
    type: ITypeInstruction;
}


export class TypedInstruction extends Instruction implements ITypedInstruction {
    protected _type: ITypeInstruction;

    constructor({ type, ...settings }: ITypedInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TypedInstruction, ...settings });
        
        this._type = Instruction.$withNoParent(type);

        // todo: remove this check
        if (isNull(this._type)) {
            console.warn("Something goes wrong! Type is not specified!", this);
        }
    }


    get type(): ITypeInstruction {
        return this._type;
    }
}
