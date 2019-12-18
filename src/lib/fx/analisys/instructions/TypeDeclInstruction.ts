import { assert, isDef, isNull } from "@lib/common";
import { EInstructionTypes, ITypeDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface ITypeDeclInstructionSettings extends IDeclInstructionSettings {
    type: ITypeInstruction;
}


// TODO: add description comment.
export class TypeDeclInstruction extends DeclInstruction implements ITypeDeclInstruction {
    readonly type: ITypeInstruction;

    constructor({ type, ...settings }: ITypeDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TypeDecl, ...settings });
        this.type =  Instruction.$withParent(type, this);
        assert(isDef(this.type));
    }


    get name(): string {
        return this.type.name;
    }
    

    toCode(): string {
        return this.type.toDeclString() + ";";
    }
}
