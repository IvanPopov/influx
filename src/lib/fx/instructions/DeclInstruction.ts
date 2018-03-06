import { TypedInstruction, ITypedInstructionSettings } from "./TypedInstruction";
import { IDeclInstruction, IAnnotationInstruction, EInstructionTypes, IIdInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export interface IDeclInstructionSettings extends ITypedInstructionSettings {
    semantics?: string;
    annotation?: IAnnotationInstruction;
}

export class DeclInstruction extends TypedInstruction implements IDeclInstruction {
    protected _semantics: string
    protected _annotation: IAnnotationInstruction;
    
    protected _bIsBuiltIn: boolean;
    protected _bForPixel: boolean;
    protected _bForVertex: boolean;
    
    constructor({ semantics = null, annotation = null, ...settings }: IDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DeclInstruction, ...settings });

        this._semantics = semantics;
        this._annotation = annotation;

        this._bIsBuiltIn = false;
        this._bForPixel = true;
        this._bForVertex = true;
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


    get nameID(): IIdInstruction {
        return null;
    }

    get builtIn(): boolean {
        return this._bIsBuiltIn;
    }

    set builtIn(val: boolean) {
        this._bIsBuiltIn = val;
    }

    get vertex(): boolean {
        return this._bForVertex;
    }

    get pixel(): boolean {
        return this._bForPixel;
    }

    $makeVertexCompatible(val = true): void {
        this._bForVertex = val;
    }

    $makePixelCompatible(val = true): void {
        this._bForPixel = val;
    }
}
