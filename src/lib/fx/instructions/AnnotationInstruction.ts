import { IAnnotationInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class AnnotationInstruction extends Instruction implements IAnnotationInstruction {
    constructor(node: IParseNode) {
        super(node, EInstructionTypes.k_AnnotationInstruction);
    }
}
