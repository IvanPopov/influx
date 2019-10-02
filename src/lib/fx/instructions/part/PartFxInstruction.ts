import { EInstructionTypes, ETechniqueType } from "@lib/idl/IInstruction";
import { IFunctionDeclInstruction, IPartFxInstruction, IPartFxPassInstruction } from "../../../idl/IInstruction";
import { ITechniqueInstructionSettings, TechniqueInstruction } from "../TechniqueInstruction";


// prohibition of explicitly indicating the type of technique
export interface IPartFxInstructionSettings extends Omit<ITechniqueInstructionSettings<IPartFxPassInstruction>, "techniqueType"> {
    spawnRoutine: IFunctionDeclInstruction;
    initRoutine: IFunctionDeclInstruction;
    updateRoutine: IFunctionDeclInstruction;
}

// var s: IPartFxInstructionSettings;
// s.te

export class PartFxInstruction extends TechniqueInstruction<IPartFxPassInstruction> implements IPartFxInstruction {
    protected _spawnRoutine: IFunctionDeclInstruction;
    protected _initRoutine: IFunctionDeclInstruction;
    protected _updateRoutine: IFunctionDeclInstruction;

    constructor({ spawnRoutine, initRoutine, updateRoutine, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDeclInstruction, techniqueType: ETechniqueType.k_PartFx, ...settings });

        this._spawnRoutine = spawnRoutine;
        this._initRoutine = initRoutine;
        this._updateRoutine = updateRoutine;
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
