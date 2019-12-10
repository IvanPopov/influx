import { EInstructionTypes, IAnnotationInstruction, IDeclInstruction, IIdInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IDeclInstructionSettings extends IInstructionSettings {
    readonly semantic?: string;
    readonly annotation?: IAnnotationInstruction;
}


export class DeclInstruction extends Instruction implements IDeclInstruction {
    protected _semantic: string
    protected _annotation: IAnnotationInstruction;
    
    constructor({ semantic = null, annotation = null, ...settings }: IDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Decl, ...settings });

        this._semantic = semantic;
        this._annotation = Instruction.$withParent(annotation, this);
    }
    

    get semantic(): string {
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
