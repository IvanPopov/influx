import { TypedInstruction } from "./TypedInstruction";
import { IAFXDeclInstruction, IAFXAnnotationInstruction, EAFXInstructionTypes, IAFXIdInstruction, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";

export class DeclInstruction extends TypedInstruction implements IAFXDeclInstruction {
    protected _sSemantic: string = "";
    protected _pAnnotation: IAFXAnnotationInstruction = null;
    protected _bForPixel: boolean = true;
    protected _bForVertex: boolean = true;
    protected _bIsBuiltIn: boolean = false;

    constructor() {
        super();
        this._eInstructionType = EAFXInstructionTypes.k_DeclInstruction;
    }

    _setSemantic(sSemantic: string): void {
        this._sSemantic = sSemantic;
    }

    _setAnnotation(pAnnotation: IAFXAnnotationInstruction): void {
        this._pAnnotation = pAnnotation;
    }

    _getName(): string {
        return "";
    }

    _getRealName(): string {
        return "";
    }

    _getNameId(): IAFXIdInstruction {
        return null;
    }

    _getSemantic(): string {
        return this._sSemantic;
    }

    _isBuiltIn(): boolean {
        return this._bIsBuiltIn;
    }

    _setBuiltIn(isBuiltIn: boolean): void {
        this._bIsBuiltIn = isBuiltIn;
    }

    _isForAll(): boolean {
        return this._bForVertex && this._bForPixel;
    }
    _isForPixel(): boolean {
        return this._bForPixel;
    }
    _isForVertex(): boolean {
        return this._bForVertex;
    }

    public _setForAll(canUse: boolean): void {
        this._bForVertex = canUse;
        this._bForPixel = canUse;
    }
    public _setForPixel(canUse: boolean): void {
        this._bForPixel = canUse;
    }
    public _setForVertex(canUse: boolean): void {
        this._bForVertex = canUse;
    }

    public _clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXDeclInstruction {
        let pClonedInstruction: IAFXDeclInstruction = <IAFXDeclInstruction>(super._clone(pRelationMap));
        pClonedInstruction._setSemantic(this._sSemantic);
        pClonedInstruction._setAnnotation(this._pAnnotation);
        return pClonedInstruction;
    }
}
