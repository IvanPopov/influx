import { IAFXAnnotationInstruction, EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { Instruction } from "./Instruction";

export class AnnotationInstruction extends Instruction implements IAFXAnnotationInstruction {
    constructor() {
        super();
        this._eInstructionType = EAFXInstructionTypes.k_AnnotationInstruction;
    }
}
