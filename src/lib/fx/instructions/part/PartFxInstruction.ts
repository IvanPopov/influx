import { EInstructionTypes, ETechniqueType, IStructDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ICompileExprInstruction } from "../../../idl/IInstruction";
import { ITechniqueInstructionSettings, TechniqueInstruction } from "../TechniqueInstruction";
import { IPartFxPassInstruction, IPartFxInstruction } from "@lib/idl/IPartFx";


// prohibition of explicitly indicating the type of technique
export interface IPartFxInstructionSettings extends Omit<ITechniqueInstructionSettings<IPartFxPassInstruction>, "techniqueType"> {
    spawnRoutine: ICompileExprInstruction;
    initRoutine: ICompileExprInstruction;
    updateRoutine: ICompileExprInstruction;
    particle: ITypeInstruction;
}

// var s: IPartFxInstructionSettings;
// s.te

export class PartFxInstruction extends TechniqueInstruction<IPartFxPassInstruction> implements IPartFxInstruction {
    protected _spawnRoutine: ICompileExprInstruction;
    protected _initRoutine: ICompileExprInstruction;
    protected _updateRoutine: ICompileExprInstruction;
    protected _particle: ITypeInstruction;
    protected _material: ITypeInstruction;

    constructor({ spawnRoutine, initRoutine, updateRoutine, particle, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDeclInstruction, techniqueType: ETechniqueType.k_PartFx, ...settings });

        this._spawnRoutine = spawnRoutine;
        this._initRoutine = initRoutine;
        this._updateRoutine = updateRoutine;
        this._particle = particle;
    }

    get spawnRoutine(): ICompileExprInstruction {
        return this._spawnRoutine;
    }

    
    get initRoutine(): ICompileExprInstruction {
        return this._initRoutine;
    }

    
    get updateRoutine(): ICompileExprInstruction {
        return this._updateRoutine;
    }

    get particle(): ITypeInstruction {
        return this._particle;
    }
}
