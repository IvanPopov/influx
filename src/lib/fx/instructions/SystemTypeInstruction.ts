import { isDef, isNull } from "../../common";
import { IAFXVariableDeclInstruction, IAFXInstruction, IAFXTypeInstruction, EAFXBlendMode, IAFXVariableTypeInstruction, EAFXInstructionTypes, IAFXIdInstruction, IAFXTypeDeclInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { Instruction } from "./Instruction";
import { IdInstruction } from "./IdInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class SystemTypeInstruction extends Instruction implements IAFXTypeInstruction {
    private _sName: string = "";
    private _sRealName: string = "";
    private _pElementType: IAFXTypeInstruction = null;
    private _iLength: number = 1;
    private _iSize: number = null;
    private _pFieldDeclMap: IMap<IAFXVariableDeclInstruction> = null;
    private _bIsArray: boolean = false;
    private _bIsWritable: boolean = true;
    private _bIsReadable: boolean = true;
    private _pFieldNameList: string[] = null;
    private _pWrapVariableType: IAFXVariableTypeInstruction = null;
    private _bIsBuiltIn: boolean = true;
    private _sDeclString: string = "";

    constructor(pNode: IParseNode) {
        super(pNode);
        this._eInstructionType = EAFXInstructionTypes.k_SystemTypeInstruction;
        this._pWrapVariableType = new VariableTypeInstruction(null);
        this._pWrapVariableType.pushType(this);
    }

    toString(): string {
        return this.name || this.hash;
    }

    toDeclString(): string {
        return this._sDeclString;
    }

    _toFinalCode(): string {
        return this._sRealName;
    }

    get builtIn(): boolean {
        return this._bIsBuiltIn;
    }

    set builtIn(isBuiltIn: boolean) {
        this._bIsBuiltIn = isBuiltIn;
    }

    get declString(): string {
        return this.toDeclString();
    }

    set declString(sDecl: string) {
        this._sDeclString = sDecl;
    }

    isBase(): boolean {
        return true;
    }

    isArray(): boolean {
        return this._bIsArray;
    }

    isNotBaseArray(): boolean {
        return false;
    }

    isComplex(): boolean {
        return false;
    }

    isEqual(pType: IAFXTypeInstruction): boolean {
        return this.hash === pType.hash;
    }

    isStrongEqual(pType: IAFXTypeInstruction): boolean {
        return this.strongHash === pType.strongHash;
    }

    isConst(): boolean {
        return false;
    }

    isSampler(): boolean {
        return this.name === "sampler" ||
            this.name === "sampler2D" ||
            this.name === "samplerCUBE";
    }

    isSamplerCube(): boolean {
        return this.name === "samplerCUBE";
    }

    isSampler2D(): boolean {
        return this.name === "sampler" ||
            this.name === "sampler2D";
    }


    get writable(): boolean {
        return this._bIsWritable;
    }

    get readable(): boolean {
        return this._bIsReadable;
    }

    isContainArray(): boolean {
        return false;
    }

    isContainSampler(): boolean {
        return false;
    }

    isContainPointer(): boolean {
        return false;
    }

    isContainComplexType(): boolean {
        return false;
    }


    set name(sName: string) {
        this._sName = sName;
    }

    set realName(sRealName: string) {
        this._sRealName = sRealName;
    }

    set size(iSize: number) {
        this._iSize = iSize;
    }

    set writable(isWritable: boolean) {
        this._bIsWritable = isWritable;
    }

    set readable(isReadable: boolean) {
        this._bIsReadable = isReadable;
    }

    addIndex(pType: IAFXTypeInstruction, iLength: number): void {
        this._pElementType = pType;
        this._iLength = iLength;
        this._iSize = iLength * pType.size;
        this._bIsArray = true;
    }

    addField(sFieldName: string, pType: IAFXTypeInstruction, isWrite: boolean = true,
        sRealFieldName: string = sFieldName): void {

        var pField: IAFXVariableDeclInstruction = new VariableDeclInstruction(null);
        var pFieldType: VariableTypeInstruction = new VariableTypeInstruction(null);
        var pFieldId: IAFXIdInstruction = new IdInstruction(null);

        pFieldType.pushType(pType);
        pFieldType.wriatable = (isWrite);

        pFieldId.name = (sFieldName);
        pFieldId.realName = (sRealFieldName);

        pField.push(pFieldType, true);
        pField.push(pFieldId, true);

        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IAFXVariableDeclInstruction>>{};
        }

        this._pFieldDeclMap[sFieldName] = pField;

        if (isNull(this._pFieldNameList)) {
            this._pFieldNameList = [];
        }

        this._pFieldNameList.push(sFieldName);
    }

    get name(): string {
        return this._sName;
    }

    get realName(): string {
        return this._sRealName;
    }

    get hash(): string {
        return this._sRealName;
    }

    get strongHash(): string {
        return this._sName;
    }

    get size(): number {
        return this._iSize;
    }

    get baseType(): IAFXTypeInstruction {
        return this;
    }

    get variableType(): IAFXVariableTypeInstruction {
        return this._pWrapVariableType;
    }

    get arrayElementType(): IAFXTypeInstruction {
        return this._pElementType;
    }

    get typeDecl(): IAFXTypeDeclInstruction {
        if (this.builtIn) {
            return null;
        }

        return <IAFXTypeDeclInstruction>this.parent;
    }


    get length(): number {
        return this._iLength;
    }

    hasField(sFieldName: string): boolean {
        return isDef(this._pFieldDeclMap[sFieldName]);
    }

    hasFieldWithSematic(sSemantic: string): boolean {
        return false;
    }

    hasAllUniqueSemantics(): boolean {
        return false;
    }

    hasFieldWithoutSemantic(): boolean {
        return false;
    }

    getField(sFieldName: string): IAFXVariableDeclInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName] : null;
    }

    getFieldBySemantic(sSemantic: string): IAFXVariableDeclInstruction {
        return null;
    }

    getFieldType(sFieldName: string): IAFXVariableTypeInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName].type : null;
    }

    getFieldNameList(): string[] {
        return this._pFieldNameList;
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): SystemTypeInstruction {
        return this;
    }
}

