import { IPassInstructionSettings, PassInstruction } from "@lib/fx/instructions/PassInstruction";
import { EInstructionTypes, ICompileExprInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { IPartFxPassInstruction, EPartFxPassGeometry } from "@lib/idl/IPartFx";
import { isNull } from "@lib/common";


export interface IPartFxPassInstructionSettings extends IPassInstructionSettings {
    sorting: boolean;
    prerenderRoutine: ICompileExprInstruction;
    geometry: EPartFxPassGeometry;
}


export class PartFxPassInstruction extends PassInstruction implements IPartFxPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;
    readonly geometry: EPartFxPassGeometry;

    constructor({ sorting, prerenderRoutine, geometry, ...settings }: IPartFxPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxPassInstruction, ...settings });
        
        this.sorting = sorting;
        this.prerenderRoutine = prerenderRoutine;
        this.geometry = geometry;
    }

    get particleInstance(): ITypeInstruction {
        if (isNull(this.prerenderRoutine)) {
            return null;
        }

        return this.prerenderRoutine.function.def.paramList[1].type.subType;
    }

    isValid(): boolean {
        return !!this.particleInstance && !!this.prerenderRoutine;
    }
}

