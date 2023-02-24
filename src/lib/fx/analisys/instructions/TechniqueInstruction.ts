import { EInstructionTypes, ETechniqueType, IPassInstruction, IPresetInstruction, ITechniqueInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from './Instruction';

export interface ITechniqueInstructionSettings<PassType extends IPassInstruction> extends IDeclInstructionSettings {
    name: string;
    techniqueType: ETechniqueType;
    passes: PassType[];
    presets: IPresetInstruction[];
}


export class TechniqueInstruction<PassType extends IPassInstruction> extends DeclInstruction implements ITechniqueInstruction {
    readonly type: ETechniqueType;
    readonly passes: PassType[];

    readonly presets: IPresetInstruction[];

    protected _name: string;

    constructor({ name, techniqueType, passes, presets, ...settings }: ITechniqueInstructionSettings<PassType>) {
        super({ instrType: EInstructionTypes.k_TechniqueDecl, ...settings });
        
        this._name = name;
        this.passes = passes?.map(pass => Instruction.$withParent(pass, this));
        this.type = techniqueType;

        this.presets = presets;
    }


    get name() {
        return this._name;
    }


    isValid(): boolean {
        return true;
    }
}
