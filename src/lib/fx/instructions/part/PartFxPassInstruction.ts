import { IPassInstructionSettings, PassInstruction } from "@lib/fx/instructions/PassInstruction";
import { EInstructionTypes, ICompileExprInstruction } from "@lib/idl/IInstruction";
import { IPartFxPassInstruction } from "@lib/idl/IPartFx";


export interface IPartFxPassInstructionSettings extends IPassInstructionSettings {
    sorting: boolean;
    defaultShader: boolean;
    prerenderRoutine: ICompileExprInstruction;
}


export class PartFxPassInstruction extends PassInstruction implements IPartFxPassInstruction {
    readonly sorting: boolean;
    readonly defaultShader: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;

    constructor({ sorting, defaultShader, prerenderRoutine, ...settings }: IPartFxPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxPassInstruction, ...settings });
        
        this.sorting = sorting;
        this.defaultShader = defaultShader;
        this.prerenderRoutine = prerenderRoutine;
    }
}

