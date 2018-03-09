import { TypedInstruction, ITypedInstructionSettings } from "./TypedInstruction";
import { IDeclInstruction, IAnnotationInstruction, EInstructionTypes, IIdInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IDeclInstructionSettings extends IInstructionSettings {
    semantics?: string;
    annotation?: IAnnotationInstruction;
    builtIn?: boolean;
}

export class DeclInstruction extends Instruction implements IDeclInstruction {
    protected _semantics: string
    protected _annotation: IAnnotationInstruction;
    
    protected _bIsBuiltIn: boolean;
    
    constructor({ semantics = null, annotation = null, builtIn = false, ...settings }: IDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DeclInstruction, ...settings });

        this._semantics = semantics;
        this._annotation = Instruction.$withParent(annotation, this);

        this._bIsBuiltIn = builtIn;
    }
    

    get semantics(): string {
        return this._semantics;
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

    
    get builtIn(): boolean {
        return this._bIsBuiltIn;
    }
}
