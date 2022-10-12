import { EInstructionTypes, ETechniqueType, IPassInstruction, IPresetInstruction, ITechniqueInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from './Instruction';

export interface ITechniqueInstructionSettings<PassType extends IPassInstruction> extends IDeclInstructionSettings {
    name: string;
    techniqueType: ETechniqueType;
    passList: PassType[];
    presets: IPresetInstruction[];
}


export class TechniqueInstruction<PassType extends IPassInstruction> extends DeclInstruction implements ITechniqueInstruction {
    protected _name: string;
    protected _techniqueType: ETechniqueType;
    protected _passList: PassType[];

    readonly presets: IPresetInstruction[];

    constructor({ name, techniqueType, passList, presets, ...settings }: ITechniqueInstructionSettings<PassType>) {
        super({ instrType: EInstructionTypes.k_TechniqueDecl, ...settings });
        
        this._name = name;
        this._passList = passList.map(pass => Instruction.$withParent(pass, this));
        this._techniqueType = techniqueType;

        this.presets = presets;
    }

    // todo: add id support?
    // get id();

    get name(): string {
        return this._name;
    }

    get passList(): PassType[] {
        return this._passList;
    }

    get type(): ETechniqueType {
        return this._techniqueType;
    }

    isValid(): boolean {
        return true;
    }
}
