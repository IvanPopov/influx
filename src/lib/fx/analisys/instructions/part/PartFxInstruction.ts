import { EInstructionTypes, ETechniqueType, IStructDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { ICompileExprInstruction } from "@lib/idl/IInstruction";
import { IPartFxInstruction, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";
import { T_VOID } from "../../SystemScope";

import { ITechniqueInstructionSettings, TechniqueInstruction } from "../TechniqueInstruction";

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
    readonly spawnRoutine: ICompileExprInstruction;
    readonly initRoutine: ICompileExprInstruction;
    readonly updateRoutine: ICompileExprInstruction;
    readonly particle: ITypeInstruction;
    readonly capacity: number;

    constructor({ spawnRoutine, initRoutine, updateRoutine, particle, capacity = -1, ...settings }: IPartFxInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxDecl, techniqueType: ETechniqueType.k_PartFx, ...settings });

        this.spawnRoutine = spawnRoutine;
        this.initRoutine = initRoutine;
        this.updateRoutine = updateRoutine;
        this.particle = particle;
        this.capacity = capacity;
    }

    isValid() {
        if (!this.spawnRoutine) {
            console.error(`no spawn routine found`);
            return false;
        }

        if (!this.spawnRoutine.function.def.returnType.isEqual(T_VOID)) {
            if (!this.initRoutine) {
                console.error(`init routine must be defined if regular spawner is used`);
                return false;
            }
        }

        if (!this.updateRoutine) {
            console.error(`no update routine found`);
            return false;
        }

        const particleCheck = !!this.particle;
        const passCheck = this.passList && this.passList.filter((pass: IPartFxPassInstruction) => pass.isValid()).length > 0;
        return particleCheck && passCheck;
    }
}
