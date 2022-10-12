import { assert, isDef } from "@lib/common";
import { EInstructionTypes, ITypedefInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface ITypedefInstructionSettings extends IDeclInstructionSettings {
    type: ITypeInstruction;
    alias: string;
}


// TODO: add description comment.
export class TypedefInstruction extends DeclInstruction implements ITypedefInstruction {
    readonly type: ITypeInstruction;
    readonly alias: string;

    constructor({ type, alias, ...settings }: ITypedefInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TypedefDecl, ...settings });
        this.type =  Instruction.$withNoParent(type);
        this.alias = alias;
        assert(isDef(this.type));
    }


    get name(): string {
        return this.type?.name;
    }
    

    toCode(): string {
        return `typedef ${this.type.toDeclString()} ${this.alias};`;
    }
}
