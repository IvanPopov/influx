import { IAFXAnnotationInstruction, EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class AnnotationInstruction extends Instruction implements IAFXAnnotationInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._eInstructionType = EAFXInstructionTypes.k_AnnotationInstruction;
    }
}
