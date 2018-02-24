import { isDef, isNull } from "../../common";
import { IVariableDeclInstruction, IInstruction, ITypeInstruction, IVariableTypeInstruction, EInstructionTypes, IIdInstruction, ITypeDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { Instruction } from "./Instruction";
import { IdInstruction } from "./IdInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class SystemTypeInstruction extends Instruction implements ITypeInstruction {
    private _sName: string;
    private _sRealName: string;
    private _pElementType: ITypeInstruction;
    private _iLength: number;
    private _iSize: number;
    private _pFieldDeclMap: IMap<IVariableDeclInstruction>;
    private _bIsArray: boolean;
    private _bIsWritable: boolean;
    private _bIsReadable: boolean;
    private _pFieldNameList: string[];
    private _pWrapVariableType: IVariableTypeInstruction;
    private _bIsBuiltIn: boolean;
    private _sDeclString: string;

    constructor() {
        super(null, EInstructionTypes.k_SystemTypeInstruction);

        this._sName = null;
        this._sRealName = null;
        this._pElementType = null;
        this._iLength = 1;
        this._iSize = null;
        this._pFieldDeclMap = {};
        this._bIsArray = false;
        this._bIsWritable = true;
        this._bIsReadable = true;
        this._pFieldNameList = [];
        this._bIsBuiltIn = true;
        this._sDeclString = "";

        this._pWrapVariableType = new VariableTypeInstruction(null);
        this._pWrapVariableType.pushType(this);
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

    get writable(): boolean {
        return this._bIsWritable;
    }

    get readable(): boolean {
        return this._bIsReadable;
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

    get baseType(): ITypeInstruction {
        return this;
    }

    get variableType(): IVariableTypeInstruction {
        return this._pWrapVariableType;
    }

    get arrayElementType(): ITypeInstruction {
        return this._pElementType;
    }

    get typeDecl(): ITypeDeclInstruction {
        if (this.builtIn) {
            return null;
        }

        return <ITypeDeclInstruction>this.parent;
    }


    get length(): number {
        return this._iLength;
    }

    get fieldDeclList(): IVariableDeclInstruction[] {
        let pList = [];
        for (let key in this._pFieldDeclMap) {
            pList.push(this._pFieldDeclMap[key]);
        }
        return pList;
    }

    get fieldNameList(): string[] {
        let pList = [];
        for (let key in this._pFieldDeclMap) {
            pList.push(key);
        }
        return pList;
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

    isEqual(pType: ITypeInstruction): boolean {
        return this.hash === pType.hash;
    }

    isStrongEqual(pType: ITypeInstruction): boolean {
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

    toString(): string {
        return this.name || this.hash;
    }

    toDeclString(): string {
        return this._sDeclString;
    }

    toCode(): string {
        return this._sRealName;
    }

    addIndex(pType: ITypeInstruction, iLength: number): void {
        this._pElementType = pType;
        this._iLength = iLength;
        this._iSize = iLength * pType.size;
        this._bIsArray = true;
    }

    addField(sFieldName: string, pType: ITypeInstruction, isWrite: boolean = true,
        sRealFieldName: string = sFieldName): void {

        var pField: IVariableDeclInstruction = new VariableDeclInstruction(null);
        var pFieldType: VariableTypeInstruction = new VariableTypeInstruction(null);
        var pFieldId: IIdInstruction = new IdInstruction(null);

        pFieldType.pushType(pType);
        pFieldType.writable = (isWrite);

        pFieldId.name = (sFieldName);
        pFieldId.realName = (sRealFieldName);

        pField.push(pFieldType, true);
        pField.push(pFieldId, true);

        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IVariableDeclInstruction>>{};
        }

        this._pFieldDeclMap[sFieldName] = pField;

        if (isNull(this._pFieldNameList)) {
            this._pFieldNameList = [];
        }

        this._pFieldNameList.push(sFieldName);
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

    getField(sFieldName: string): IVariableDeclInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName] : null;
    }

    getFieldBySemantic(sSemantic: string): IVariableDeclInstruction {
        return null;
    }

    getFieldType(sFieldName: string): IVariableTypeInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName].type : null;
    }

    getFieldNameList(): string[] {
        return this._pFieldNameList;
    }

    _clone(pRelationMap?: IMap<IInstruction>): SystemTypeInstruction {
        return this;
    }
}

