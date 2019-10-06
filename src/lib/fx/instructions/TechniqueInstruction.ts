import { isNull } from '../../common';
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction, ETechniqueType } from "../../idl/IInstruction";
import { EInstructionTypes, IPassInstruction, ITechniqueInstruction } from '../../idl/IInstruction';
import { DeclInstruction } from './DeclInstruction';
import { PassInstruction } from './PassInstruction';
import { IParseNode } from '../../idl/parser/IParser';
import { Instruction } from './Instruction';


export interface ITechniqueInstructionSettings<PassType extends IPassInstruction> extends IDeclInstructionSettings {
    name: string;
    techniqueType: ETechniqueType;
    passList: PassType[];
}


export class TechniqueInstruction<PassType extends IPassInstruction> extends DeclInstruction implements ITechniqueInstruction {
    protected _name: string;
    protected _techniqueType: ETechniqueType;
    protected _passList: PassType[];

    constructor({ name, techniqueType, passList, ...settings }: ITechniqueInstructionSettings<PassType>) {
        super({ instrType: EInstructionTypes.k_TechniqueInstruction, ...settings });
        
        this._name = name;
        this._passList = passList.map(pass => Instruction.$withParent(pass, this));
        this._techniqueType = techniqueType;
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
}
