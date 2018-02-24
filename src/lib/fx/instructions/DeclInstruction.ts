import { TypedInstruction } from "./TypedInstruction";
import { IDeclInstruction, IAnnotationInstruction, EInstructionTypes, IIdInstruction, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class DeclInstruction extends TypedInstruction implements IDeclInstruction {
    protected _sSemantics: string = "";
    protected _pAnnotation: IAnnotationInstruction = null;
    protected _bForPixel: boolean = true;
    protected _bForVertex: boolean = true;
    protected _bIsBuiltIn: boolean = false;

    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_DeclInstruction) {
        super(pNode, eType);
    }

    get semantics(): string {
        return this._sSemantics;
    }

    set semantics(sSemantic: string) {
        this._sSemantics = sSemantic;
    }

    set annotation(pAnnotation: IAnnotationInstruction) {
        this._pAnnotation = pAnnotation;
    }

    get annotation(): IAnnotationInstruction {
        return this._pAnnotation;
    }

    get name(): string {
        return "";
    }

    get realName(): string {
        return "";
    }

    get nameID(): IIdInstruction {
        return null;
    }

    get builtIn(): boolean {
        return this._bIsBuiltIn;
    }

    set builtIn(isBuiltIn: boolean) {
        this._bIsBuiltIn = isBuiltIn;
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
