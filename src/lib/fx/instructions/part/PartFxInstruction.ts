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
    capacity?: number;
}

// var s: IPartFxInstructionSettings;
// s.te

export class PartFxInstruction extends TechniqueInstruction<IPartFxPassInstruction> implements IPartFxInstruction {
    protected _spawnRoutine: ICompileExprInstruction;
    protected _initRoutine: ICompileExprInstruction;
    protected _updateRoutine: ICompileExprInstruction;
    protected _particle: ITypeInstruction;
    protected _material: ITypeInstruction;
    protected _capacity: number;

    constructor({ spawnRoutine, initRoutine, updateRoutine, particle, capacity = -1, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDeclInstruction, techniqueType: ETechniqueType.k_PartFx, ...settings });

        this._spawnRoutine = spawnRoutine;
        this._initRoutine = initRoutine;
        this._updateRoutine = updateRoutine;
        this._particle = particle;
        this._capacity = capacity;
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

    get capacity(): number {
        return this._capacity;
    }

    isValid() {
        const routineCheck = !!this.spawnRoutine && !!this.initRoutine && !!this.updateRoutine;
        const particleCheck = !!this.particle;
        const passCheck = this.passList && this.passList.filter((pass: IPartFxPassInstruction) => pass.isValid()).length > 0;

        return routineCheck && particleCheck && passCheck;
    }
}
