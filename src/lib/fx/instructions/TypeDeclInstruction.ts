import { DeclInstruction } from "./DeclInstruction";
import { assert, isDef, isNull } from "../../common";
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction } from "../../idl/IInstruction";
import { ITypeDeclInstruction, EInstructionTypes, ITypeInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
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
