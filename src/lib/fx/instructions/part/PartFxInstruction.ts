import { DeclInstruction, IDeclInstructionSettings } from "@lib/fx/instructions/DeclInstruction";
import { Instruction } from "@lib/fx/instructions/Instruction";
import { EInstructionTypes, IPassInstruction } from "@lib/idl/IInstruction";
import { IFunctionDeclInstruction, IPartFxInstruction, IPartFxPassInstruction } from "../../../idl/IInstruction";


export interface IPartFxInstructionSettings extends IDeclInstructionSettings {
    name: string;
    passList: IPartFxPassInstruction[];
    spawnRoutine: IFunctionDeclInstruction;
    initRoutine: IFunctionDeclInstruction;
    updateRoutine: IFunctionDeclInstruction;
}


export class PartFxInstruction extends DeclInstruction implements IPartFxInstruction {
    protected _name: string;
    protected _passList: IPartFxPassInstruction[];
    protected _spawnRoutine: IFunctionDeclInstruction;
    protected _initRoutine: IFunctionDeclInstruction;
    protected _updateRoutine: IFunctionDeclInstruction;

    constructor({ name, spawnRoutine, initRoutine, updateRoutine, passList, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDeclInstruction, ...settings });

        this._name = name;
        this._passList = passList.map(pass => Instruction.$withParent(pass, this));
        this._spawnRoutine = spawnRoutine;
        this._initRoutine = initRoutine;
        this._updateRoutine = updateRoutine;
    }


    get name(): string {
        return this._name;
    }


    get passList(): IPartFxPassInstruction[] {
        return this._passList;
    }


    get spawnRoutine(): IFunctionDeclInstruction {
        return this._spawnRoutine;
    }

    
    get initRoutine(): IFunctionDeclInstruction {
        return this._initRoutine;
    }

    
    get updateRoutine(): IFunctionDeclInstruction {
        return this._updateRoutine;
    }
}
