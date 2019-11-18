import { isNull } from "@lib/common";
import { EInstructionTypes, ITypedInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";


export interface ITypedInstructionSettings extends IInstructionSettings {
    type: ITypeInstruction;
}


export class TypedInstruction extends Instruction implements ITypedInstruction {
    protected _type: ITypeInstruction;

    constructor({ type, ...settings }: ITypedInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Typed, ...settings });
        
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
