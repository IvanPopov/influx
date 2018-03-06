import { IAnnotationInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { Instruction, IInstructionSettings } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    
    constructor({ ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_AnnotationInstruction, ...settings });
    }
}
