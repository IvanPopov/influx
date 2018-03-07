import { DeclInstruction } from "./DeclInstruction";
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import { ITypeDeclInstruction, EInstructionTypes, ITypeInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


// todo: add description comment.
export class TypeDeclInstruction extends DeclInstruction implements ITypeDeclInstruction {
    protected _type: ITypeInstruction;

    constructor(node: IParseNode, type: ITypeInstruction, semantics: string = null, annotation: IAnnotationInstruction = null) {
        super(node, semantics, annotation, EInstructionTypes.k_TypeDeclInstruction);
        this._type = type;
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
