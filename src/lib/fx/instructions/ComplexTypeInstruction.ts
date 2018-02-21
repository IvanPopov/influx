
import { Instruction } from "./Instruction";
import { IAFXTypeInstruction, IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXInstruction, IAFXVariableTypeInstruction, IAFXTypeDeclInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { isNull, isDef } from "../../common";
import { logger } from "../../logger"
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class ComplexTypeInstruction extends Instruction implements IAFXTypeInstruction {
    private _sName: string = "";
    private _sRealName: string = "";

    private _sHash: string = "";
    private _sStrongHash: string = "";

    private _iSize: number = 0;

    private _pFieldDeclMap: IMap<IAFXVariableDeclInstruction> = null;
    private _pFieldDeclList: IAFXVariableDeclInstruction[] = null;
    private _pFieldNameList: string[] = null;

    private _pFieldDeclBySemanticMap: IMap<IAFXVariableDeclInstruction> = null;
    private _bHasAllUniqueSemantics: boolean = true;
    private _bHasFieldWithoutSemantic: boolean = false;

    private _isContainArray: boolean = false;
    private _isContainSampler: boolean = false;
    private _isContainComplexType: boolean = false;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_ComplexTypeInstruction;
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
        if (this._sHash === "") {
            this.calcHash();
        }

        return this._sHash;
    }

    get strongHash(): string {
        if (this._sStrongHash === "") {
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

    get baseType(): IAFXTypeInstruction {
        return this;
    }

    get arrayElementType(): IAFXTypeInstruction {
        return null;
    }

    get typeDecl(): IAFXTypeDeclInstruction {
        return <IAFXTypeDeclInstruction>this.parent;
    }

    get length(): number {
        return 0;
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

    addField(pVariable: IAFXVariableDeclInstruction): void {
        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IAFXVariableDeclInstruction>>{};
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

        var pType: IAFXVariableTypeInstruction = pVariable.type;
        //pType._markAsField();

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

    addFields(pFieldCollector: IAFXInstruction, isSetParent: boolean = true): void {
        this._pFieldDeclList = <IAFXVariableDeclInstruction[]>(pFieldCollector.instructions);

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

    getField(sFieldName: string): IAFXVariableDeclInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        return this._pFieldDeclMap[sFieldName];
    }

    getFieldBySemantic(sSemantic: string): IAFXVariableDeclInstruction {
        if (!this.hasFieldWithSematic(sSemantic)) {
            return null;
        }

        return this._pFieldDeclBySemanticMap[sSemantic];
    }

    getFieldType(sFieldName: string): IAFXVariableTypeInstruction {
        return isDef(this._pFieldDeclMap[sFieldName]) ? this._pFieldDeclMap[sFieldName].type : null;
    }

    getFieldNameList(): string[] {
        return this._pFieldNameList;
    }

    getFieldDeclList(): IAFXVariableDeclInstruction[] {
        return this._pFieldDeclList;
    }

    clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): ComplexTypeInstruction {
        if (this._pParentInstruction === null ||
            !isDef(pRelationMap[this._pParentInstruction.instructionID]) ||
            pRelationMap[this._pParentInstruction.instructionID] === this._pParentInstruction) {
            return this;
        }

        var pClone: ComplexTypeInstruction = <ComplexTypeInstruction>super.clone(pRelationMap);

        pClone.setCloneName(this._sName, this._sRealName);
        pClone.setCloneHash(this._sHash, this._sStrongHash);
        pClone.setCloneContain(this._isContainArray, this._isContainSampler);

        var pFieldDeclList: IAFXVariableDeclInstruction[] = new Array(this._pFieldDeclList.length);
        var pFieldNameList: string[] = new Array(this._pFieldNameList.length);
        var pFieldDeclMap: IMap<IAFXVariableDeclInstruction> = <IMap<IAFXVariableDeclInstruction>>{};

        for (var i: number = 0; i < this._pFieldDeclList.length; i++) {
            let pCloneVar: IAFXVariableDeclInstruction = this._pFieldDeclList[i].clone(pRelationMap);
            var sVarName: string = pCloneVar.name;

            pFieldDeclList[i] = pCloneVar;
            pFieldNameList[i] = sVarName;
            pFieldDeclMap[sVarName] = pCloneVar;
        }

        pClone.setCloneFields(pFieldDeclList, pFieldNameList,
            pFieldDeclMap);
        pClone.size =(this._iSize);

        return pClone;
    }

    public setCloneName(sName: string, sRealName: string): void {
        this._sName = sName;
        this._sRealName = sRealName;
    }

    public setCloneHash(sHash: string, sStrongHash: string): void {
        this._sHash = sHash;
        this._sStrongHash = sStrongHash;
    }

    public setCloneContain(isContainArray: boolean, isContainSampler: boolean): void {
        this._isContainArray = isContainArray;
        this._isContainSampler = isContainSampler;
    }

    public setCloneFields(pFieldDeclList: IAFXVariableDeclInstruction[], pFieldNameList: string[],
        pFieldDeclMap: IMap<IAFXVariableDeclInstruction>): void {
        this._pFieldDeclList = pFieldDeclList;
        this._pFieldNameList = pFieldNameList;
        this._pFieldDeclMap = pFieldDeclMap;
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
        this._pFieldDeclBySemanticMap = <IMap<IAFXVariableDeclInstruction>>{};

        for (let i: number = 0; i < this._pFieldDeclList.length; i++) {
            let pVar: IAFXVariableDeclInstruction = this._pFieldDeclList[i];
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
            let pVarType: IAFXVariableTypeInstruction = this._pFieldDeclList[i].type;
            let iVarSize: number = pVarType.size;

            if (iVarSize === Instruction.UNDEFINE_SIZE) {
                this._setError(EEffectErrors.CANNOT_CALCULATE_PADDINGS, { typeName: this.name });
                return;
            }

            pVarType.setPadding(iPadding);
            iPadding += iVarSize;
        }
    }
}
