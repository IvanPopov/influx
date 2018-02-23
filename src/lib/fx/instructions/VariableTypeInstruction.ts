import { Instruction } from "./Instruction";
import { IAFXVariableTypeInstruction, IAFXTypeInstruction, IAFXExprInstruction, IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXIdInstruction, IAFXTypeDeclInstruction, IAFXIdExprInstruction, IAFXInstruction } from '../../idl/IAFXInstruction';
import { IMap } from "../../idl/IMap";
import { isNull, isNumber, isDef } from '../../common';
import { IdInstruction } from "./IdInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { IntInstruction } from "./IntInstruction";
import { IdExprInstruction } from "./IdExprInstruction"
import * as Effect from "../Effect"
import { IParseNode } from "../../idl/parser/IParser";


export class VariableTypeInstruction extends Instruction implements IAFXVariableTypeInstruction {
    private _pSubType: IAFXTypeInstruction = null;
    private _pUsageList: string[] = null;

    private _sName: string = "";
    private _bIsWritable: boolean = null;
    private _bIsReadable: boolean = null;

    private _sHash: string = "";
    private _sStrongHash: string = "";
    private _bIsArray: boolean = false;
    private _bIsUniform: boolean = null;
    private _bIsConst: boolean = null;
    private _iLength: number = Instruction.UNDEFINE_LENGTH;
    private _isNeedToUpdateLength: boolean = false;

    private _bIsFromVariableDecl: boolean = null;
    private _bIsFromTypeDecl: boolean = null;

    private _pArrayIndexExpr: IAFXExprInstruction = null;
    private _pArrayElementType: IAFXVariableTypeInstruction = null;

    private _pFieldDeclMap: IMap<IAFXVariableDeclInstruction> = null;
    private _pFieldDeclBySemanticMap: IMap<IAFXVariableDeclInstruction> = null;

    private _iPadding: number = Instruction.UNDEFINE_PADDING;

    private _pSubDeclList: IAFXVariableDeclInstruction[] = null;
    private _pAttrOffset: IAFXVariableDeclInstruction = null;

    private _bUnverifiable: boolean = false;
    private _bCollapsed: boolean = false;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pSourceNode = pNode;
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_VariableTypeInstruction;
    }

    toString(): string {
        return this.name || this.subType.toString() || this.hash;
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

    get wriatable(): boolean {
        if (!isNull(this._bIsWritable)) {
            return this._bIsWritable;
        }

        if ((this.isArray() && !this.isBase()) || this.isUniform()) {
            this._bIsWritable = false;
        }
        else {
            this._bIsWritable = this.subType.writable;
        }

        return this._bIsWritable;
    }

    get readable(): boolean {
        if (!isNull(this._bIsReadable)) {
            return this._bIsReadable;
        }

        if (this.hasUsage("out")) {
            this._bIsReadable = false;
        }
        else {
            this._bIsReadable = this.subType.readable;
        }

        return this._bIsReadable;
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

    get baseType(): IAFXTypeInstruction {
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

    get arrayElementType(): IAFXVariableTypeInstruction {
        if (this.isUnverifiable()) {
            return this;
        }

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

    get typeDecl(): IAFXTypeDeclInstruction {
        if (!this.isFromTypeDecl()) {
            return null;
        }

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;

        if (eParentType === EAFXInstructionTypes.k_TypeDeclInstruction) {
            return <IAFXTypeDeclInstruction>this.parent;
        }
        else {
            return (<IAFXTypeInstruction>this.parent).typeDecl;
        }
    }

    get fieldNameList(): string[] {
        return this.subType.fieldNameList;
    }

    get usageList(): string[] {
        return this._pUsageList;
    }

    get subType(): IAFXTypeInstruction {
        return this._pSubType;
    }


    get vars(): IAFXVariableDeclInstruction[] {
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

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;

        if (eParentType === EAFXInstructionTypes.k_VariableDeclInstruction) {
            return (<IAFXVariableDeclInstruction>this.parent).fullName;
        }
        else {
            return (<IAFXVariableTypeInstruction>this.parent).fullName;
        }
    }

    get varDeclName(): string {
        if (!this.isFromVariableDecl()) {
            return "";
        }

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;

        if (eParentType === EAFXInstructionTypes.k_VariableDeclInstruction) {
            return (<IAFXVariableDeclInstruction>this.parent).name;
        }
        else {
            return (<IAFXVariableTypeInstruction>this.parent).varDeclName;
        }
    }

    get typeDeclName(): string {
        if (!this.isFromVariableDecl()) {
            return "";
        }

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;

        if (eParentType === EAFXInstructionTypes.k_VariableDeclInstruction) {
            return (<IAFXTypeDeclInstruction>this.parent).name;
        }
        else {
            return (<IAFXVariableTypeInstruction>this.parent).typeDeclName;
        }
    }

    get parentVarDecl(): IAFXVariableDeclInstruction {
        if (!this.isFromVariableDecl()) {
            return null;
        }

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;

        if (eParentType === EAFXInstructionTypes.k_VariableDeclInstruction) {
            return <IAFXVariableDeclInstruction>this.parent;
        }
        else {
            return (<IAFXVariableTypeInstruction>this.parent).parentVarDecl;
        }
    }

    get parentContainer(): IAFXVariableDeclInstruction {
        if (!this.isFromVariableDecl() || !this.isTypeOfField()) {
            return null;
        }

        var pContainerType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>this.parentVarDecl.parent;
        if (!pContainerType.isFromVariableDecl()) {
            return null;
        }

        return pContainerType.parentVarDecl;
    }

    get mainVariable(): IAFXVariableDeclInstruction {
        if (!this.isFromVariableDecl()) {
            return null;
        }

        if (this.isTypeOfField()) {
            return (<IAFXVariableTypeInstruction>this.parent.parent).mainVariable;
        }
        else {
            return (<IAFXVariableDeclInstruction>this.parentVarDecl);
        }
    }


    get attrOffset(): IAFXVariableDeclInstruction {
        return this._pAttrOffset;
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


    isEqual(pType: IAFXTypeInstruction): boolean {
        if (this.isUnverifiable()) {
            return true;
        }

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

    isStrongEqual(pType: IAFXTypeInstruction): boolean {
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

    containArray(): boolean {
        return this.subType.containArray();
    }

    containSampler(): boolean {
        return this.subType.containSampler();
    }

    containComplexType(): boolean {
        return this.subType.containComplexType();
    }

    isFromVariableDecl(): boolean {
        if (!isNull(this._bIsFromVariableDecl)) {
            return this._bIsFromVariableDecl;
        }

        if (isNull(this.parent)) {
            this._bIsFromVariableDecl = false;
        }
        else {
            var eParentType: EAFXInstructionTypes = this.parent.instructionType;

            if (eParentType === EAFXInstructionTypes.k_VariableDeclInstruction) {
                this._bIsFromVariableDecl = true;
            }
            else if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction) {
                this._bIsFromVariableDecl = (<IAFXVariableTypeInstruction>this.parent).isFromVariableDecl();
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
            var eParentType: EAFXInstructionTypes = this.parent.instructionType;

            if (eParentType === EAFXInstructionTypes.k_TypeDeclInstruction) {
                this._bIsFromTypeDecl = true;
            }
            else if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction) {
                this._bIsFromTypeDecl = (<IAFXVariableTypeInstruction>this.parent).isFromVariableDecl();
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

        if (this.parent.instructionType === EAFXInstructionTypes.k_VariableDeclInstruction) {
            var pParentDecl: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>this.parent;
            return pParentDecl.isField();
        }

        return false;
    }

    isUnverifiable(): boolean {
        return this._bUnverifiable;
    }

    pushType(pType: IAFXTypeInstruction): void {
        var eType: EAFXInstructionTypes = pType.instructionType;

        if (eType === EAFXInstructionTypes.k_SystemTypeInstruction ||
            eType === EAFXInstructionTypes.k_ComplexTypeInstruction) {
            this._pSubType = pType;
        }
        else {
            var pVarType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pType;
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

    addArrayIndex(pExpr: IAFXExprInstruction): void {
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

    markAsUnverifiable(isUnverifiable: boolean): void {
        this._bUnverifiable = true;
    }

    addAttrOffset(pOffset: IAFXVariableDeclInstruction): void {
        this._pAttrOffset = pOffset;
    }

    hasField(sFieldName: string): boolean {
        return this.isUnverifiable() ? true : this.subType.hasField(sFieldName);
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

    getField(sFieldName: string): IAFXVariableDeclInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        if (isNull(this._pFieldDeclMap)) {
            this._pFieldDeclMap = <IMap<IAFXVariableDeclInstruction>>{};
        }

        if (isDef(this._pFieldDeclMap[sFieldName])) {
            return this._pFieldDeclMap[sFieldName];
        }

        var pField: IAFXVariableDeclInstruction = new VariableDeclInstruction(null);

        if (!this.isUnverifiable()) {
            var pSubField: IAFXVariableDeclInstruction = this.subType.getField(sFieldName);

            var pFieldType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);
            pFieldType.pushType(pSubField.type);
            // if(!this.isBase()){
            pFieldType.padding = (pSubField.type.padding);
            // }
            pField.push(pFieldType, true);
            pField.push(pSubField.nameID, false);
            pField.semantics = (pSubField.semantics);
        }
        else {
            var pFieldName: IAFXIdInstruction = new IdInstruction(null);

            pFieldName.name = (sFieldName);
            pFieldName.realName = (sFieldName);

            pField.push(this, false);
            pField.push(pFieldName, true);
        }

        pField.parent = (this);

        this._pFieldDeclMap[sFieldName] = pField;

        return pField;
    }

    getFieldBySemantic(sSemantic: string): IAFXVariableDeclInstruction {
        if (this.hasFieldWithSematic(sSemantic)) {
            return null;
        }

        if (isNull(this._pFieldDeclBySemanticMap)) {
            this._pFieldDeclBySemanticMap = <IMap<IAFXVariableDeclInstruction>>{};
        }

        if (isDef(this._pFieldDeclBySemanticMap[sSemantic])) {
            return this._pFieldDeclBySemanticMap[sSemantic];
        }

        var pField: IAFXVariableDeclInstruction = new VariableDeclInstruction(null);
        var pSubField: IAFXVariableDeclInstruction = this.subType.getFieldBySemantic(sSemantic);

        var pFieldType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);
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

    getFieldType(sFieldName: string): IAFXVariableTypeInstruction {
        return <IAFXVariableTypeInstruction>this.getField(sFieldName).type;
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

        if (!isNull(this.subType) && this.subType.instructionType === EAFXInstructionTypes.k_VariableTypeInstruction) {
            return (<IAFXVariableTypeInstruction>this.subType).hasUsage(sUsageName);
        }

        return false;
    }


    getFieldExpr(sFieldName: string): IAFXIdExprInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }
        var pField: IAFXVariableDeclInstruction = this.getField(sFieldName);
        var pExpr: IAFXIdExprInstruction = new IdExprInstruction(null);
        pExpr.push(pField.nameID, false);
        pExpr.type = (pField.type);

        return pExpr;
    }

    getFieldIfExist(sFieldName: string): IAFXVariableDeclInstruction {
        if (isNull(this._pFieldDeclMap) && isDef(this._pFieldDeclMap[sFieldName])) {
            return this._pFieldDeclMap[sFieldName];
        }
        else {
            return null;
        }
    }


    wrap(): IAFXVariableTypeInstruction {
        var pCloneType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);
        pCloneType.pushType(this);

        return pCloneType;
    }

    clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXVariableTypeInstruction {
        if (isDef(pRelationMap[this.instructionID])) {
            return <IAFXVariableTypeInstruction>pRelationMap[this.instructionID];
        }

        if (this._pParentInstruction === null ||
            !isDef(pRelationMap[this._pParentInstruction.instructionID]) ||
            pRelationMap[this._pParentInstruction.instructionID] === this._pParentInstruction) {
            //pRelationMap[this.instructionID] = this;
            return this;
        }

        let pClone: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>super.clone(pRelationMap);

        pClone.pushType(this._pSubType.clone(pRelationMap));
        if (!isNull(this._pUsageList)) {
            for (let i: number = 0; i < this._pUsageList.length; i++) {
                pClone.addUsage(this._pUsageList[i]);
            }
        }

        pClone.writable = (this._bIsWritable);
        pClone.readable = (this._bIsReadable);
        pClone.setCloneHash(this._sHash, this._sStrongHash);
        pClone.padding = (this.padding);

        if (this._bIsArray) {
            pClone.setCloneArrayIndex(this._pArrayElementType.clone(pRelationMap),
                this._pArrayIndexExpr.clone(pRelationMap),
                this._iLength);
        }

        if (!isNull(this._pFieldDeclMap)) {
            let sFieldName: string = "";
            let pCloneFieldMap: IMap<IAFXVariableDeclInstruction> = <IMap<IAFXVariableDeclInstruction>>{};

            for (sFieldName in this._pFieldDeclMap) {
                pCloneFieldMap[sFieldName] = this._pFieldDeclMap[sFieldName].clone(pRelationMap);
            }

            pClone.setCloneFields(pCloneFieldMap);
        }

        return pClone;
    }

    setCloneHash(sHash: string, sStrongHash: string): void {
        this._sHash = sHash;
        this._sStrongHash = sStrongHash;
    }

    setCloneArrayIndex(pElementType: IAFXVariableTypeInstruction,
        pIndexExpr: IAFXExprInstruction, iLength: number): void {
        this._bIsArray = true;
        this._pArrayElementType = pElementType;
        this._pArrayIndexExpr = pIndexExpr;
        this._iLength = iLength;
    }


    setCloneFields(pFieldMap: IMap<IAFXVariableDeclInstruction>): void {
        this._pFieldDeclMap = pFieldMap;
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

        let pDeclList: IAFXVariableDeclInstruction[] = [];
        let i: number = 0;

        if (!isNull(this._pAttrOffset)) {
            pDeclList.push(this._pAttrOffset);
        }

        if (this.isComplex()) {
            let pFieldNameList: string[] = this.fieldNameList;

            for (i = 0; i < pFieldNameList.length; i++) {
                const pField: IAFXVariableDeclInstruction = this.getField(pFieldNameList[i]);
                const pFieldSubDeclList: IAFXVariableDeclInstruction[] = pField.vars;

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
