import { IAnnotationInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    constructor(pNode: IParseNode) {
        super(EInstructionTypes.k_AnnotationInstruction, pNode);
    }
}
