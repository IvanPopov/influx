import { isNull } from '../../common';
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import { EInstructionTypes, IPassInstruction, ITechniqueInstruction } from '../../idl/IInstruction';
import { DeclInstruction } from './DeclInstruction';
import { PassInstruction } from './PassInstruction';
import { IParseNode } from '../../idl/parser/IParser';


export interface ITechniqueInstructionSettings extends IDeclInstructionSettings {
    name: string;
    passList: IPassInstruction[];
}


export class TechniqueInstruction extends DeclInstruction implements ITechniqueInstruction {
    protected _name: string;
    protected _passList: IPassInstruction[];

    constructor({ name, passList , ...settings }: ITechniqueInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TechniqueInstruction, ...settings });
        
        this._name = name;
        this._passList = passList.map(pass => pass.$withParent(this));
    }


    get name(): string {
        return this._name;
    }

    
    get passList(): IPassInstruction[] {
        return this._passList;
    }
}
