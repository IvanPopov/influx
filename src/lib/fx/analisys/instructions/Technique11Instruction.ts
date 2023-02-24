import { EInstructionTypes, IPass11Instruction, IPresetInstruction, ITechnique11Instruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from './Instruction';

export interface ITechniqueInstructionSettings extends IDeclInstructionSettings {
    name: string;
    passes: IPass11Instruction[];
    presets: IPresetInstruction[];
}


export class Technique11Instruction extends DeclInstruction implements ITechnique11Instruction {
    protected _name: string;

    readonly passes: IPass11Instruction[];

    constructor({ name, passes, presets, ...settings }: ITechniqueInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Technique11Decl, ...settings });
        
        this._name = name;
        this.passes = passes?.map(pass => Instruction.$withParent(pass, this));
    }

    get name() {
        return this._name;
    }

    /** @deprecated */
    isValid(): boolean {
        return true;
    }
}
