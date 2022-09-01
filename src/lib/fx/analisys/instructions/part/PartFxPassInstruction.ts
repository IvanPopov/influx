import { isNull } from "@lib/common";
import { IPassInstructionSettings, PassInstruction } from "@lib/fx/analisys/instructions/PassInstruction";
import { EInstructionTypes, ICompileExprInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { EPassDrawMode, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";

export interface IPartFxPassInstructionSettings extends IPassInstructionSettings {
    sorting?: boolean;
    prerenderRoutine: ICompileExprInstruction;
    geometry: string;
    instanceCount?: number;
    drawMode?: EPassDrawMode;
}


export class PartFxPassInstruction extends PassInstruction implements IPartFxPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;
    readonly geometry: string;
    readonly instanceCount: number;
    readonly drawMode: EPassDrawMode;

    constructor({ sorting = false, instanceCount = 1, drawMode = EPassDrawMode.k_Auto, prerenderRoutine, geometry, ...settings }: IPartFxPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxPass, ...settings });
        
        this.sorting = sorting;
        this.prerenderRoutine = prerenderRoutine;
        this.geometry = geometry;
        this.instanceCount = instanceCount;
        this.drawMode = drawMode;
    }

    get particleInstance(): ITypeInstruction {
        if (isNull(this.prerenderRoutine)) {
            return null;
        }

        return this.prerenderRoutine.function.def.params[1].type.subType;
    }

    isValid(): boolean {
        return !!this.particleInstance && !!this.prerenderRoutine;
    }
}

