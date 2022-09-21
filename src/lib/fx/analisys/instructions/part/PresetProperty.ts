import { EInstructionTypes, IExprInstruction, IIdInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IFxPresetProperty } from "@lib/idl/part/IPartFx";
import { IInstructionSettings, Instruction } from "../Instruction";

export interface IPresetInstructionSettings extends IInstructionSettings {
    id: IIdInstruction;
    args: IExprInstruction[];
}

export class PresetProperty extends Instruction implements IFxPresetProperty {
    readonly id: IIdInstruction;
    readonly args: IExprInstruction[];

    constructor({ id, args, ...settings }: IPresetInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PresetProperty, ...settings });
        this.id = Instruction.$withParent(id, this);
        this.args = args.map(arg => Instruction.$withParent(arg, this));
    }

    resolveDeclaration(): IVariableDeclInstruction {
        return this.scope.findVariable(this.id.name);
    }

    toCode() {
        return `${this.id} = { ${this.args.map(arg => arg.toCode()).join(',')} }`;
    }
}
