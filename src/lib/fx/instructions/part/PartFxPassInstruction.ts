import { IPassInstructionSettings, PassInstruction } from "@lib/fx/instructions/PassInstruction";
import { EInstructionTypes, ICompileExprInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { IPartFxPassInstruction } from "@lib/idl/IPartFx";
import { isNull } from "@lib/common";


export interface IPartFxPassInstructionSettings extends IPassInstructionSettings {
    sorting: boolean;
    prerenderRoutine: ICompileExprInstruction;
}


export class PartFxPassInstruction extends PassInstruction implements IPartFxPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;

    constructor({ sorting, prerenderRoutine, ...settings }: IPartFxPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxPassInstruction, ...settings });
        
        this.sorting = sorting;
        this.prerenderRoutine = prerenderRoutine;
    }

    get material(): ITypeInstruction {
        if (isNull(this.prerenderRoutine)) {
            return null;
        }

        return this.prerenderRoutine.function.definition.paramList[1].type.subType;
    }

    isValid(): boolean {
        return !!this.material && !!this.prerenderRoutine;
    }
}

