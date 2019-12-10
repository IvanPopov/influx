import { assert, isDef, isNull } from "@lib/common";
import { EInstructionTypes, ITypeDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface ITypeDeclInstructionSettings extends IDeclInstructionSettings {
    type: ITypeInstruction;
}


// todo: add description comment.
export class TypeDeclInstruction extends DeclInstruction implements ITypeDeclInstruction {
    protected _type: ITypeInstruction;

    constructor({ type, ...settings }: ITypeDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TypeDecl, ...settings });
        
        this._type =  Instruction.$withParent(type, this);

        assert(isDef(this.type));

        // todo: remove this check
        if (isNull(this._type)) {
            console.warn("Something goes wrong! Type is not specified!", this);
        }
    }


    get type(): ITypeInstruction {
        return this._type;
    }
    

    get name(): string {
        return this.type.name;
    }
    

    toCode(): string {
        return this.type.toDeclString() + ";";
    }
}
