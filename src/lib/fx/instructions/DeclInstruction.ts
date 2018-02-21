import { TypedInstruction } from "./TypedInstruction";
import { IAFXDeclInstruction, IAFXAnnotationInstruction, EAFXInstructionTypes, IAFXIdInstruction, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class DeclInstruction extends TypedInstruction implements IAFXDeclInstruction {
    protected _sSemantic: string = "";
    protected _pAnnotation: IAFXAnnotationInstruction = null;
    protected _bForPixel: boolean = true;
    protected _bForVertex: boolean = true;
    protected _bIsBuiltIn: boolean = false;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._eInstructionType = EAFXInstructionTypes.k_DeclInstruction;
    }

    get semantics(): string {
        return this._sSemantic;
    }

    set semantics(sSemantic: string) {
        this._sSemantic = sSemantic;
    }

    set annotation(pAnnotation: IAFXAnnotationInstruction) {
        this._pAnnotation = pAnnotation;
    }

    get annotation(): IAFXAnnotationInstruction {
        return this._pAnnotation;
    }

    get name(): string {
        return "";
    }

    get realName(): string {
        return "";
    }

    get nameID(): IAFXIdInstruction {
        return null;
    }

    get builtIn(): boolean {
        return this._bIsBuiltIn;
    }

    set builtIn(isBuiltIn: boolean) {
        this._bIsBuiltIn = isBuiltIn;
    }

    isForAll(): boolean {
        return this._bForVertex && this._bForPixel;
    }

    isForPixel(): boolean {
        return this._bForPixel;
    }

    isForVertex(): boolean {
        return this._bForVertex;
    }

    public setForAll(canUse: boolean): void {
        this._bForVertex = canUse;
        this._bForPixel = canUse;
    }

    public setForPixel(canUse: boolean): void {
        this._bForPixel = canUse;
    }

    public setForVertex(canUse: boolean): void {
        this._bForVertex = canUse;
    }

    public clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXDeclInstruction {
        let pClonedInstruction: IAFXDeclInstruction = <IAFXDeclInstruction>(super.clone(pRelationMap));
        pClonedInstruction.semantics = (this._sSemantic);
        pClonedInstruction.annotation = (this._pAnnotation);
        return pClonedInstruction;
    }
}
