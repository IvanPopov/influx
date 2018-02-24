
import { Instruction } from "./Instruction";
import { ITypeInstruction, IVariableDeclInstruction, EInstructionTypes, IInstruction, IVariableTypeInstruction, ITypeDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull, isDef } from "../../common";
import { logger } from "../../logger"
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class ComplexTypeInstruction extends Instruction implements ITypeInstruction {
    private _sName: string;
    private _sRealName: string;

    private _sHash: string;
    private _sStrongHash: string;

    private _iSize: number;

    private _pFieldDeclMap: IMap<IVariableDeclInstruction>;
    private _pFieldDeclList: IVariableDeclInstruction[];
    private _pFieldNameList: string[];

    private _pFieldDeclBySemanticMap: IMap<IVariableDeclInstruction>;
    private _bHasAllUniqueSemantics: boolean;
    private _bHasFieldWithoutSemantic: boolean;

    private _isContainArray: boolean;
    private _isContainSampler: boolean;
    private _isContainComplexType: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ComplexTypeInstruction);

        this._sName = null;
        this._sRealName = null;
        this._sHash = null;
        this._sStrongHash = null;
        this._iSize = 0;
        this._pFieldDeclMap = {};
        this._pFieldDeclList = [];
        this._pFieldNameList = [];
        this._pFieldDeclBySemanticMap = {};
        this._bHasAllUniqueSemantics = true;
        this._bHasFieldWithoutSemantic = false;
        this._isContainArray = false;
        this._isContainSampler = false;
        this._isContainComplexType = false;
    }

    get builtIn(): boolean {
        return false;
    }
    
    get writable(): boolean {
        return true;
    }

    get readable(): boolean {
        return true;
    }

    set size(iSize: number) {
        this._iSize = iSize;
    }

    get name(): string {
        return this._sName;
    }

    set name(sName: string) {
        this._sName = sName;
        this._sRealName = sName;
    }

    get realName(): string {
        return this._sRealName;
    }

    set realName(sRealName: string) {
        this._sRealName = sRealName;
    }

    get hash(): string {
        if (isNull(this._sHash)) {
            this.calcHash();
        }

        return this._sHash;
    }

    get strongHash(): string {
        if (isNull(this._sStrongHash)) {
            this.calcStrongHash();
        }

        return this._sStrongHash;
    }

    get size(): number {
        if (this._iSize === Instruction.UNDEFINE_SIZE) {
            this._iSize = this.calcSize();
        }
        return this._iSize;
    }

    get baseType(): ITypeInstruction {
        return this;
    }

    get arrayElementType(): ITypeInstruction {
        return null;
    }

    get typeDecl(): ITypeDeclInstruction {
        return <ITypeDeclInstruction>this.parent;
    }

    get length(): number {
        return 0;
    }

    get fieldNameList(): string[] {
        return this._pFieldNameList;
    }

    get fieldDeclList(): IVariableDeclInstruction[] {
        return this._pFieldDeclList;
    }

    toString(): string {
        return this.name || this.hash;
    }

    toDeclString(): string {
        var sCode: string = "struct " + this._sRealName + "{";

        for (var i: number = 0; i < this._pFieldDeclList.length; i++) {
            sCode += "\t" + this._pFieldDeclList[i].toCode() + ";\n";
        }

        sCode += "}";

        return sCode;
    }

    toCode(): string {
        return this._sRealName;
    }

    isBase(): boolean {
        return false;
    }

    isArray(): boolean {
        return false;
    }

    isNotBaseArray(): boolean {
        return false;
    }

    isComplex(): boolean {
        return true;
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
        return false;
    }

    isSamplerCube(): boolean {
        return false;
    }

    isSampler2D(): boolean {
        return false;
    }

    isContainArray(): boolean {
        return this._isContainArray;
    }

    isContainSampler(): boolean {
        return this._isContainSampler;
    }

    isContainComplexType(): boolean {
        return this._isContainComplexType;
    }

    addField(pVariable: IVariableDeclInstruction): void {
        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IVariableDeclInstruction>>{};
            this._pFieldNameList = [];
        }

        if (isNull(this._pFieldDeclList)) {
            this._pFieldDeclList = [];
        }

        var sVarName: string = pVariable.name;
        this._pFieldDeclMap[sVarName] = pVariable;

        if (this._iSize !== Instruction.UNDEFINE_SIZE) {
            var iSize: number = pVariable.type.size;
            if (iSize !== Instruction.UNDEFINE_SIZE) {
                this._iSize += iSize;
            }
            else {
                this._iSize = Instruction.UNDEFINE_SIZE;
            }
        }

        this._pFieldNameList.push(sVarName);

        if (this._pFieldDeclList.length < this._pFieldNameList.length) {
            this._pFieldDeclList.push(pVariable);
        }

        var pType: IVariableTypeInstruction = pVariable.type;

        if (pType.isNotBaseArray() || pType.isContainArray()) {
            this._isContainArray = true;
        }

        if (Effect.isSamplerType(pType) || pType.isContainSampler()) {
            this._isContainSampler = true;
        }

        if (pType.isComplex()) {
            this._isContainComplexType = true;
        }
    }

    addFields(pFieldCollector: IInstruction, isSetParent: boolean = true): void {
        this._pFieldDeclList = <IVariableDeclInstruction[]>(pFieldCollector.instructions);

        for (var i: number = 0; i < this._pFieldDeclList.length; i++) {
            this.addField(this._pFieldDeclList[i]);
            this._pFieldDeclList[i].parent = (this);
        }

        this.calculatePaddings();
    }

    hasField(sFieldName: string): boolean {
        return isDef(this._pFieldDeclMap[sFieldName]);
    }

    hasFieldWithSematic(sSemantic: string): boolean {
        if (isNull(this._pFieldDeclBySemanticMap)) {
            this.analyzeSemantics();
        }

        return isDef(this._pFieldDeclBySemanticMap[sSemantic]);
    }

    hasAllUniqueSemantics(): boolean {
        if (isNull(this._pFieldDeclBySemanticMap)) {
            this.analyzeSemantics();
        }
        return this._bHasAllUniqueSemantics;
    }

    hasFieldWithoutSemantic(): boolean {
        if (isNull(this._pFieldDeclBySemanticMap)) {
            this.analyzeSemantics();
        }
        return this._bHasFieldWithoutSemantic;
    }

    getField(sFieldName: string): IVariableDeclInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        return this._pFieldDeclMap[sFieldName];
    }

    getFieldBySemantic(sSemantic: string): IVariableDeclInstruction {
        if (!this.hasFieldWithSematic(sSemantic)) {
            return null;
        }

        return this._pFieldDeclBySemanticMap[sSemantic];
    }

    getFieldType(sFieldName: string): IVariableTypeInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName].type : null;
    }

    public calcSize(): number {
        let iSize: number = 0;

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            let iFieldSize: number = this._pFieldDeclList[i].type.size;

            if (iFieldSize === Instruction.UNDEFINE_SIZE) {
                iSize = Instruction.UNDEFINE_SIZE;
                break;
            }
            else {
                iSize += iFieldSize;
            }
        }

        return iSize;
    }

    private calcHash(): void {
        let sHash: string = "{";

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            sHash += this._pFieldDeclList[i].type.hash + ";";
        }

        sHash += "}";

        this._sHash = sHash;
    }

    private calcStrongHash(): void {
        let sStrongHash: string = "{";

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            sStrongHash += this._pFieldDeclList[i].type.strongHash + ";";
        }

        sStrongHash += "}";

        this._sStrongHash = sStrongHash;
    }

    private analyzeSemantics(): void {
        this._pFieldDeclBySemanticMap = <IMap<IVariableDeclInstruction>>{};

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            let pVar: IVariableDeclInstruction = this._pFieldDeclList[i];
            let sSemantic: string = pVar.semantics;

            if (sSemantic === "") {
                this._bHasFieldWithoutSemantic = true;
            }

            if (isDef(this._pFieldDeclBySemanticMap[sSemantic])) {
                this._bHasAllUniqueSemantics = false;
            }

            this._pFieldDeclBySemanticMap[sSemantic] = pVar;

            this._bHasFieldWithoutSemantic = this._bHasFieldWithoutSemantic || pVar.type.hasFieldWithoutSemantic();
            if (this._bHasAllUniqueSemantics && pVar.type.isComplex()) {
                this._bHasAllUniqueSemantics = pVar.type.hasAllUniqueSemantics();
            }
        }

    }

    private calculatePaddings(): void {
        let iPadding: number = 0;

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            let pVarType: IVariableTypeInstruction = this._pFieldDeclList[i].type;
            let iVarSize: number = pVarType.size;

            if (iVarSize === Instruction.UNDEFINE_SIZE) {
                this._setError(EEffectErrors.CANNOT_CALCULATE_PADDINGS, { typeName: this.name });
                return;
            }

            pVarType.padding = iPadding;
            iPadding += iVarSize;
        }
    }
}
