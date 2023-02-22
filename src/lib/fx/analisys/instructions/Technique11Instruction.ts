import { EInstructionTypes, IPass11Instruction, IPresetInstruction, ITechnique11Instruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from './Instruction';

export interface ITechniqueInstructionSettings<PassType extends IPass11Instruction> extends IDeclInstructionSettings {
    name: string;
    passList: PassType[];
    presets: IPresetInstruction[];
}


export class Technique11Instruction<PassType extends IPass11Instruction> extends DeclInstruction implements ITechnique11Instruction {
    protected _name: string;
    protected _passList: PassType[];

    constructor({ name, passList, presets, ...settings }: ITechniqueInstructionSettings<PassType>) {
        super({ instrType: EInstructionTypes.k_Technique11Decl, ...settings });
        
        this._name = name;
        this._passList = passList?.map(pass => Instruction.$withParent(pass, this));
    }

    get name(): string {
        return this._name;
    }

    get passList(): PassType[] {
        return this._passList;
    }

    isValid(): boolean {
        return true;
    }
}
