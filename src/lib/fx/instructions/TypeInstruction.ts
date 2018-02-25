import { DeclInstruction } from "./DeclInstruction";
import { ITypeDeclInstruction, EInstructionTypes, ITypeInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

// todo: add description comment.
export class TypeDeclInstruction extends DeclInstruction implements ITypeDeclInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_TypeDeclInstruction);
    }

    get type(): ITypeInstruction {
        return <ITypeInstruction>this.instructions[0];
    }
    
    get name(): string {
        return this.type.name;
    }
    
    get realName(): string {
        return this.type.realName;
    }

    toCode(): string {
        return this.type.toDeclString() + ";";
    }
}
