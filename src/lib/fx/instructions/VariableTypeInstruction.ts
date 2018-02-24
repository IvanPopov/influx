import { Instruction } from "./Instruction";
import { IVariableTypeInstruction, ITypeInstruction, IExprInstruction, IVariableDeclInstruction, EInstructionTypes, IIdInstruction, ITypeDeclInstruction, IIdExprInstruction, IInstruction } from '../../idl/IInstruction';
import { IMap } from "../../idl/IMap";
import { isNull, isNumber, isDef } from '../../common';
import { IdInstruction } from "./IdInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { IntInstruction } from "./IntInstruction";
import { IdExprInstruction } from "./IdExprInstruction"
import * as Effect from "../Effect"
import { IParseNode } from "../../idl/parser/IParser";


export class VariableTypeInstruction extends Instruction implements IVariableTypeInstruction {
    private _pSubType: ITypeInstruction;
    private _pUsageList: string[];

    private _sName: string;
    private _bIsWritable: boolean;
    private _bIsReadable: boolean;

    private _sHash: string;
    private _sStrongHash: string;
    private _bIsArray: boolean;
    private _bIsUniform: boolean;
    private _bIsConst: boolean;
    private _iLength: number;
    private _isNeedToUpdateLength: boolean;

    private _bIsFromVariableDecl: boolean;
    private _bIsFromTypeDecl: boolean;

    private _pArrayIndexExpr: IExprInstruction;
    private _pArrayElementType: IVariableTypeInstruction;

    private _pFieldDeclMap: IMap<IVariableDeclInstruction>;
    private _pFieldDeclBySemanticMap: IMap<IVariableDeclInstruction>;

    private _iPadding: number;

    private _pSubDeclList: IVariableDeclInstruction[];
    private _pAttrOffset: IVariableDeclInstruction;

    private _bCollapsed: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_VariableTypeInstruction);

        this._pSubType = null;
        this._pUsageList = [];

        this._sName = "";
        this._bIsWritable = null;
        this._bIsReadable = null;

        this._sHash = "";
        this._sStrongHash = "";
        this._bIsArray = false;
        this._bIsUniform = null;
        this._bIsConst = null;
        this._iLength = Instruction.UNDEFINE_LENGTH;
        this._isNeedToUpdateLength = false;

        this._bIsFromVariableDecl = null;
        this._bIsFromTypeDecl = null;

        this._pArrayIndexExpr = null;
        this._pArrayElementType = null;

        this._pFieldDeclMap = {};
        this._pFieldDeclBySemanticMap = {};

        this._iPadding = Instruction.UNDEFINE_PADDING;

        this._pSubDeclList = [];
        this._pAttrOffset = null;

        this._bCollapsed = false;
    }

    get fieldDeclList(): IVariableDeclInstruction[] {
        let list = [];
        for (let key in this._pFieldDeclMap) {
            list.push(this._pFieldDeclMap[key]);
        }
        return list;
    }
    
    get builtIn(): boolean {
        return false;
    }
    
    set builtIn(isBuiltIn: boolean) {
    }
    
    set collapsed(bValue: boolean) {
        this._bCollapsed = bValue;
    }
    
    get collapsed(): boolean {
        return this._bCollapsed;
    }

    set name(sName: string) {
        this._sName = sName;
    }

    set writable(isWritable: boolean) {
        this._bIsWritable = isWritable;
    }

    set readable(isReadable: boolean) {
        this._bIsReadable = isReadable;
    }

    set padding(iPadding: number) {
        this._iPadding = iPadding;
    }

    get name(): string {
        return this._sName;
    }

    get realName(): string {
        return this.baseType.realName;
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

    get wriatable(): boolean {
        if (!this._bIsWritable) {
            return false;
        }

        if ((this.isArray() && !this.isBase()) || this.isUniform()) {
            return false;
        }
        
        return this.subType.writable;
    }

    get readable(): boolean {
        if (!this._bIsReadable) {
            return false;
        }

        if (this.hasUsage("out")) {
            return false;
        }
        
        return this.subType.readable;
    }


    get size(): number {
        if (this._bIsArray) {
            var iSize: number = this._pArrayElementType.size;
            if (this._iLength === Instruction.UNDEFINE_LENGTH ||
                iSize === Instruction.UNDEFINE_SIZE) {
                return Instruction.UNDEFINE_SIZE;
            }
            else {
                return iSize * this._iLength;
            }
        }
        else {
            return this.subType.size;
        }
    }

    get baseType(): ITypeInstruction {
        return this.subType.baseType;
    }

    get length(): number {
        if (!this.isNotBaseArray()) {
            this._iLength = 0;
            return 0;
        }

        if (this.isNotBaseArray() && !this._bIsArray) {
            this._iLength = this.subType.length;
        }
        else if (this._iLength === Instruction.UNDEFINE_LENGTH || this._isNeedToUpdateLength) {
            var isEval: boolean = this._pArrayIndexExpr.evaluate();

            if (isEval) {
                var iValue: number = <number>this._pArrayIndexExpr.getEvalValue();
                this._iLength = isNumber(iValue) ? iValue : Instruction.UNDEFINE_LENGTH;
            }
        }

        return this._iLength;
    }

    get padding(): number {
        return this._iPadding;
    }

    get arrayElementType(): IVariableTypeInstruction {
        if (!this.isArray()) {
            return null;
        }

        if (isNull(this._pArrayElementType)) {
            this._pArrayElementType = new VariableTypeInstruction(null);
            this._pArrayElementType.pushType(this.subType.arrayElementType);
            if (!isNull(this._pUsageList)) {
                for (var i: number = 0; i < this._pUsageList.length; i++) {
                    this._pArrayElementType.addUsage(this._pUsageList[i]);
                }
            }
            this._pArrayElementType.parent = (this);
        }

        return this._pArrayElementType;
    }

    get typeDecl(): ITypeDeclInstruction {
        if (!this.isFromTypeDecl()) {
            return null;
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;

        if (eParentType === EInstructionTypes.k_TypeDeclInstruction) {
            return <ITypeDeclInstruction>this.parent;
        }
        else {
            return (<ITypeInstruction>this.parent).typeDecl;
        }
    }

    get fieldNameList(): string[] {
        return this.subType.fieldNameList;
    }

    get usageList(): string[] {
        return this._pUsageList;
    }

    get subType(): ITypeInstruction {
        return this._pSubType;
    }


    get vars(): IVariableDeclInstruction[] {
        if (!this.canHaveSubDecls()) {
            return null;
        }

        if (isNull(this._pSubDeclList)) {
            this.generateSubDeclList();
        }
        return this._pSubDeclList;
    }

    get fullName(): string {
        if (!this.isFromVariableDecl()) {
            return "Not from variable decl";
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;

        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return (<IVariableDeclInstruction>this.parent).fullName;
        }
        else {
            return (<IVariableTypeInstruction>this.parent).fullName;
        }
    }

    get varDeclName(): string {
        if (!this.isFromVariableDecl()) {
            return "";
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;

        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return (<IVariableDeclInstruction>this.parent).name;
        }
        else {
            return (<IVariableTypeInstruction>this.parent).varDeclName;
        }
    }

    get typeDeclName(): string {
        if (!this.isFromVariableDecl()) {
            return "";
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;

        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return (<ITypeDeclInstruction>this.parent).name;
        }
        else {
            return (<IVariableTypeInstruction>this.parent).typeDeclName;
        }
    }

    get parentVarDecl(): IVariableDeclInstruction {
        if (!this.isFromVariableDecl()) {
            return null;
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;

        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return <IVariableDeclInstruction>this.parent;
        }
        else {
            return (<IVariableTypeInstruction>this.parent).parentVarDecl;
        }
    }

    get parentContainer(): IVariableDeclInstruction {
        if (!this.isFromVariableDecl() || !this.isTypeOfField()) {
            return null;
        }

        var pContainerType: IVariableTypeInstruction = <IVariableTypeInstruction>this.parentVarDecl.parent;
        if (!pContainerType.isFromVariableDecl()) {
            return null;
        }

        return pContainerType.parentVarDecl;
    }

    get mainVariable(): IVariableDeclInstruction {
        if (!this.isFromVariableDecl()) {
            return null;
        }

        if (this.isTypeOfField()) {
            return (<IVariableTypeInstruction>this.parent.parent).mainVariable;
        }
        else {
            return (<IVariableDeclInstruction>this.parentVarDecl);
        }
    }


    get attrOffset(): IVariableDeclInstruction {
        return this._pAttrOffset;
    }

    toString(): string {
        return this.name || this.subType.toString() || this.hash;
    }

    toCode(): string {
        var sCode: string = "";
        if (!isNull(this._pUsageList)) {
            {
                for (var i: number = 0; i < this._pUsageList.length; i++) {
                    sCode += this._pUsageList[i] + " ";
                }
            }
        }

        sCode += this.subType.toCode();

        return sCode;
    }

    toDeclString(): string {
        return this.subType.toDeclString();
    }

    isBase(): boolean {
        return this.subType.isBase() && this._bIsArray === false;
    }

    isArray(): boolean {
        return this._bIsArray ||
            (this.subType.isArray());
    }

    isNotBaseArray(): boolean {
        return this._bIsArray || (this.subType.isNotBaseArray());
    }

    isComplex(): boolean {
        return this.subType.isComplex();
    }


    isEqual(pType: ITypeInstruction): boolean {
        if (this.isNotBaseArray() && pType.isNotBaseArray() &&
            (this.length !== pType.length ||
                this.length === Instruction.UNDEFINE_LENGTH ||
                pType.length === Instruction.UNDEFINE_LENGTH)) {
            return false;
        }

        if (this.hash !== pType.hash) {
            return false;
        }

        return true;
    }

    isStrongEqual(pType: ITypeInstruction): boolean {
        if (!this.isEqual(pType) || this.strongHash !== pType.strongHash) {
            return false;
        }

        return true;
    }

    isSampler(): boolean {
        return this.subType.isSampler();
    }

    isSamplerCube(): boolean {
        return this.subType.isSamplerCube();
    }

    isSampler2D(): boolean {
        return this.subType.isSampler2D();
    }

    isContainArray(): boolean {
        return this.subType.isContainArray();
    }

    isContainSampler(): boolean {
        return this.subType.isContainSampler();
    }

    isContainComplexType(): boolean {
        return this.subType.isContainComplexType();
    }

    isFromVariableDecl(): boolean {
        if (!isNull(this._bIsFromVariableDecl)) {
            return this._bIsFromVariableDecl;
        }

        if (isNull(this.parent)) {
            this._bIsFromVariableDecl = false;
        }
        else {
            var eParentType: EInstructionTypes = this.parent.instructionType;

            if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
                this._bIsFromVariableDecl = true;
            }
            else if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
                this._bIsFromVariableDecl = (<IVariableTypeInstruction>this.parent).isFromVariableDecl();
            }
            else {
                this._bIsFromVariableDecl = false;
            }
        }

        return this._bIsFromVariableDecl;
    }

    isFromTypeDecl(): boolean {
        if (!isNull(this._bIsFromTypeDecl)) {
            return this._bIsFromTypeDecl;
        }

        if (isNull(this.parent)) {
            this._bIsFromTypeDecl = false;
        }
        else {
            var eParentType: EInstructionTypes = this.parent.instructionType;

            if (eParentType === EInstructionTypes.k_TypeDeclInstruction) {
                this._bIsFromTypeDecl = true;
            }
            else if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
                this._bIsFromTypeDecl = (<IVariableTypeInstruction>this.parent).isFromVariableDecl();
            }
            else {
                this._bIsFromTypeDecl = false;
            }
        }

        return this._bIsFromTypeDecl;
    }

    isUniform(): boolean {
        if (isNull(this._bIsUniform)) {
            this._bIsUniform = this.hasUsage("uniform");
        }

        return this._bIsUniform;
    }


    isConst(): boolean {
        if (isNull(this._bIsConst)) {
            this._bIsConst = this.hasUsage("const");
        }

        return this._bIsConst;
    }


    isTypeOfField(): boolean {
        if (isNull(this.parent)) {
            return false;
        }

        if (this.parent.instructionType === EInstructionTypes.k_VariableDeclInstruction) {
            var pParentDecl: IVariableDeclInstruction = <IVariableDeclInstruction>this.parent;
            return pParentDecl.isField();
        }

        return false;
    }

    pushType(pType: ITypeInstruction): void {
        var eType: EInstructionTypes = pType.instructionType;

        if (eType === EInstructionTypes.k_SystemTypeInstruction ||
            eType === EInstructionTypes.k_ComplexTypeInstruction) {
            this._pSubType = pType;
        }
        else {
            var pVarType: IVariableTypeInstruction = <IVariableTypeInstruction>pType;
            if (!pVarType.isNotBaseArray()) {
                var pUsageList: string[] = pVarType.usageList;
                if (!isNull(pUsageList)) {
                    for (var i: number = 0; i < pUsageList.length; i++) {
                        this.addUsage(pUsageList[i]);
                    }
                }

                this._pSubType = pVarType.subType;
            }
            else {
                this._pSubType = pType;
            }
        }

    }

    addUsage(sUsage: string): void {
        if (isNull(this._pUsageList)) {
            this._pUsageList = [];
        }

        if (!this.hasUsage(sUsage)) {
            this._pUsageList.push(sUsage);
        }
    }

    addArrayIndex(pExpr: IExprInstruction): void {
        //TODO: add support for v[][10]

        this._pArrayElementType = new VariableTypeInstruction(null);
        this._pArrayElementType.pushType(this.subType);
        if (!isNull(this._pUsageList)) {
            for (var i: number = 0; i < this._pUsageList.length; i++) {
                this._pArrayElementType.addUsage(this._pUsageList[i]);
            }
        }
        this._pArrayElementType.parent = (this);

        this._pArrayIndexExpr = pExpr;

        this._iLength = this._pArrayIndexExpr.evaluate() ? this._pArrayIndexExpr.getEvalValue() : Instruction.UNDEFINE_LENGTH;

        this._bIsArray = true;

        if (this._iLength === Instruction.UNDEFINE_LENGTH) {
            this._isNeedToUpdateLength = true;
        }
    }

    addAttrOffset(pOffset: IVariableDeclInstruction): void {
        this._pAttrOffset = pOffset;
    }

    hasField(sFieldName: string): boolean {
        return this.subType.hasField(sFieldName);
    }

    hasFieldWithSematic(sSemantic: string): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasFieldWithSematic(sSemantic);
    }

    hasAllUniqueSemantics(): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasAllUniqueSemantics();
    }

    hasFieldWithoutSemantic(): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasFieldWithoutSemantic();
    }

    getField(sFieldName: string): IVariableDeclInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IVariableDeclInstruction>>{};
        }

        if (isDef(this._pFieldDeclMap[sFieldName])) {
            return this._pFieldDeclMap[sFieldName];
        }

        var pField: IVariableDeclInstruction = new VariableDeclInstruction(null);

        {
            var pSubField: IVariableDeclInstruction = this.subType.getField(sFieldName);
            var pFieldType: IVariableTypeInstruction = new VariableTypeInstruction(null);

            pFieldType.pushType(pSubField.type);
            pFieldType.padding = (pSubField.type.padding);
            pField.push(pFieldType, true);
            pField.push(pSubField.nameID, false);
            pField.semantics = (pSubField.semantics);
        }

        pField.parent = (this);

        this._pFieldDeclMap[sFieldName] = pField;

        return pField;
    }

    getFieldBySemantic(sSemantic: string): IVariableDeclInstruction {
        if (this.hasFieldWithSematic(sSemantic)) {
            return null;
        }

        if (isNull(this._pFieldDeclBySemanticMap)) {
            this._pFieldDeclBySemanticMap = <IMap<IVariableDeclInstruction>>{};
        }

        if (isDef(this._pFieldDeclBySemanticMap[sSemantic])) {
            return this._pFieldDeclBySemanticMap[sSemantic];
        }

        var pField: IVariableDeclInstruction = new VariableDeclInstruction(null);
        var pSubField: IVariableDeclInstruction = this.subType.getFieldBySemantic(sSemantic);

        var pFieldType: IVariableTypeInstruction = new VariableTypeInstruction(null);
        pFieldType.pushType(pSubField.type);
        // if(!this.isBase()){
        pFieldType.padding = (pSubField.type.padding);
        // }
        pField.push(pFieldType, true);
        pField.push(pSubField.nameID, false);


        pField.parent = (this);

        this._pFieldDeclBySemanticMap[sSemantic] = pField;

        return pField;
    }

    getFieldType(sFieldName: string): IVariableTypeInstruction {
        return <IVariableTypeInstruction>this.getField(sFieldName).type;
    }

    hasUsage(sUsageName: string): boolean {
        if (isNull(this._pUsageList)) {
            return false;
        }

        for (var i: number = 0; i < this._pUsageList.length; i++) {
            if (this._pUsageList[i] === sUsageName) {
                return true;
            }
        }

        if (!isNull(this.subType) && this.subType.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
            return (<IVariableTypeInstruction>this.subType).hasUsage(sUsageName);
        }

        return false;
    }


    getFieldExpr(sFieldName: string): IIdExprInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        let pField: IVariableDeclInstruction = this.getField(sFieldName);
        let pExpr: IIdExprInstruction = new IdExprInstruction(null);
        pExpr.push(pField.nameID, false);
        pExpr.type = pField.type;

        return pExpr;
    }

    getFieldIfExist(sFieldName: string): IVariableDeclInstruction {
        if (isNull(this._pFieldDeclMap) && isDef(this._pFieldDeclMap[sFieldName])) {
            return this._pFieldDeclMap[sFieldName];
        }
        else {
            return null;
        }
    }


    wrap(): IVariableTypeInstruction {
        var pCloneType: IVariableTypeInstruction = new VariableTypeInstruction(null);
        pCloneType.pushType(this);

        return pCloneType;
    }

    private calcHash(): void {
        let sHash: string = this.subType.hash;

        if (this._bIsArray) {
            sHash += "[";

            const iLength: number = this.length;

            if (iLength === Instruction.UNDEFINE_LENGTH) {
                sHash += "undef";
            }
            else {
                sHash += iLength.toString();
            }

            sHash += "]";
        }

        this._sHash = sHash;
    }

    private calcStrongHash(): void {
        let sStrongHash: string = this.subType.strongHash;

        if (this._bIsArray) {
            sStrongHash += "[";

            const iLength: number = this.length;

            if (iLength === Instruction.UNDEFINE_LENGTH) {
                sStrongHash += "undef";
            }
            else {
                sStrongHash += iLength.toString();
            }

            sStrongHash += "]";
        }


        this._sStrongHash = sStrongHash;
    }

    private generateSubDeclList(): void {
        if (!this.canHaveSubDecls()) {
            return;
        }

        let pDeclList: IVariableDeclInstruction[] = [];
        let i: number = 0;

        if (!isNull(this._pAttrOffset)) {
            pDeclList.push(this._pAttrOffset);
        }

        if (this.isComplex()) {
            let pFieldNameList: string[] = this.fieldNameList;

            for (i = 0; i < pFieldNameList.length; i++) {
                const pField: IVariableDeclInstruction = this.getField(pFieldNameList[i]);
                const pFieldSubDeclList: IVariableDeclInstruction[] = pField.vars;

                if (!isNull(pFieldSubDeclList)) {
                    for (let j: number = 0; j < pFieldSubDeclList.length; j++) {
                        pDeclList.push(pFieldSubDeclList[j]);
                    }
                }
            }
        }

        this._pSubDeclList = pDeclList;
    }

    private canHaveSubDecls(): boolean {
        return this.isComplex() || !isNull(this._pAttrOffset);
    }
}
