import { EInstructionTypes, IAnnotationInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    
    // TODO: implement it!

    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Annotation, ...settings });
    }
}
