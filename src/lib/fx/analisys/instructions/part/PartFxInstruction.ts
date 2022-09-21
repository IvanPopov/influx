import { EInstructionTypes, ETechniqueType, IStructDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ICompileExprInstruction } from "@lib/idl/IInstruction";
import { IFxPreset, IPartFxInstruction, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";

import { ITechniqueInstructionSettings, TechniqueInstruction } from "../TechniqueInstruction";

// prohibition of explicitly indicating the type of technique
export interface IPartFxInstructionSettings extends Omit<ITechniqueInstructionSettings<IPartFxPassInstruction>, "techniqueType"> {
    spawnRoutine: ICompileExprInstruction;
    initRoutine: ICompileExprInstruction;
    updateRoutine: ICompileExprInstruction;
    particle: ITypeInstruction;
    capacity?: number;
    presets: IFxPreset[];
}

// var s: IPartFxInstructionSettings;
// s.te

export class PartFxInstruction extends TechniqueInstruction<IPartFxPassInstruction> implements IPartFxInstruction {
    readonly spawnRoutine: ICompileExprInstruction;
    readonly initRoutine: ICompileExprInstruction;
    readonly updateRoutine: ICompileExprInstruction;
    readonly particle: ITypeInstruction;
    readonly capacity: number;
    readonly presets: IFxPreset[];

    constructor({ spawnRoutine, initRoutine, updateRoutine, particle, presets, capacity = -1, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDecl, techniqueType: ETechniqueType.k_PartFx, ...settings });

        this.spawnRoutine = spawnRoutine;
        this.initRoutine = initRoutine;
        this.updateRoutine = updateRoutine;
        this.particle = particle;
        this.capacity = capacity;
        this.presets = presets;
    }

    isValid() {
        const routineCheck = !!this.spawnRoutine && !!this.initRoutine && !!this.updateRoutine;
        const particleCheck = !!this.particle;
        const passCheck = this.passList && this.passList.filter((pass: IPartFxPassInstruction) => pass.isValid()).length > 0;

        return routineCheck && particleCheck && passCheck;
    }
}
