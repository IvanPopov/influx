import { TypedInstruction, ITypedInstructionSettings } from "./TypedInstruction";
import { IDeclInstruction, IAnnotationInstruction, EInstructionTypes, IIdInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";
import { IdInstruction } from "./IdInstruction";

export interface IDeclInstructionSettings extends IInstructionSettings {
    readonly semantics?: string;
    readonly annotation?: IAnnotationInstruction;
}


export class DeclInstruction extends Instruction implements IDeclInstruction {
    protected _semantic: string
    protected _annotation: IAnnotationInstruction;
    
    constructor({ semantics = null, annotation = null, ...settings }: IDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DeclInstruction, ...settings });

        this._semantic = semantics;
        this._annotation = Instruction.$withParent(annotation, this);
    }
    

    get semantics(): string {
        return this._semantic;
    }


    get annotation(): IAnnotationInstruction {
        return this._annotation;
    }


    get name(): string {
        return null;
    }


    get id(): IIdInstruction {
        return null;
    }
}
