import { IAnnotationInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { Instruction, IInstructionSettings } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    
    // TODO: implement it!

    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Annotation, ...settings });
    }
}
