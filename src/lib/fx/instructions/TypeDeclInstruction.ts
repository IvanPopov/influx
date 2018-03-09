import { DeclInstruction } from "./DeclInstruction";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import { ITypeDeclInstruction, EInstructionTypes, ITypeInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


export interface ITypeDeclInstructionSettings extends IDeclInstructionSettings {
    type: ITypeInstruction;
}


// todo: add description comment.
export class TypeDeclInstruction extends DeclInstruction implements ITypeDeclInstruction {
    protected _type: ITypeInstruction;

    constructor({ type, ...settings }: ITypeDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_TypeDeclInstruction, ...settings });
        
        this._type = type.$withParent(this);
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
