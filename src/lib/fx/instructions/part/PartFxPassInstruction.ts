import { IPassInstructionSettings, PassInstruction } from "@lib/fx/instructions/PassInstruction";
import { EInstructionTypes, IPartFxPassInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";


export interface IPartFxPassInstructionSettings extends IPassInstructionSettings {
    sorting: boolean;
    defaultShader: boolean;
    prerenderRoutine: IFunctionDeclInstruction;
}


export class PartFxPassInstruction extends PassInstruction implements IPartFxPassInstruction {
    readonly sorting: boolean;
    readonly defaultShader: boolean;
    readonly prerenderRoutine: IFunctionDeclInstruction;

    constructor({ sorting, defaultShader, prerenderRoutine, ...settings }: IPartFxPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PartFxPassInstruction, ...settings });
        
        this.sorting = sorting;
        this.defaultShader = defaultShader;
        this.prerenderRoutine = prerenderRoutine;
    }
}

