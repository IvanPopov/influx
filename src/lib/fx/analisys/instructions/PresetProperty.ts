import { EInstructionTypes, IExprInstruction, IIdInstruction, IPresetPropertyInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IPresetInstructionSettings extends IInstructionSettings {
    id: IIdInstruction;
    args: IExprInstruction[];
}

export class PresetProperty extends Instruction implements IPresetPropertyInstruction {
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
