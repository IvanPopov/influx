import { EInstructionTypes, IAnnotationInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IAnnotationSettings extends IInstructionSettings {
    decls: IVariableDeclInstruction[];
}

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    
    readonly decls: IVariableDeclInstruction[];

    constructor({ decls, ...settings }: IAnnotationSettings) {
        super({ instrType: EInstructionTypes.k_Annotation, ...settings });

        this.decls = decls;
    }
}
