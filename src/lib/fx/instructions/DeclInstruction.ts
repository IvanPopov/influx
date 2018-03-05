import { TypedInstruction } from "./TypedInstruction";
import { IDeclInstruction, IAnnotationInstruction, EInstructionTypes, IIdInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class DeclInstruction extends TypedInstruction implements IDeclInstruction {
    protected _semantics: string
    protected _annotation: IAnnotationInstruction;
    protected _bIsBuiltIn: boolean;
    protected _bForPixel: boolean;
    protected _bForVertex: boolean;
    
    constructor(node: IParseNode, semantics: string = null, annotation: IAnnotationInstruction = null, type: EInstructionTypes = EInstructionTypes.k_DeclInstruction) {
        super(node, null, type);

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

    get realName(): string {
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

    set vertex(bVal: boolean) {
        this._bForVertex = true;
    }

    get pixel(): boolean {
        return this._bForPixel;
    }

    set pixel(bVal: boolean) {
        this._bForPixel = true;
    }
}
