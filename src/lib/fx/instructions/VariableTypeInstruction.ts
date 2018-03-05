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
    private _subType: ITypeInstruction;
    private _usageList: string[];

    private _isWritable: boolean;
    private _isReadable: boolean;

    private _isArray: boolean;
    private _isUniform: boolean;
    private _isConst: boolean;
    private _length: number;

    private _arrayIndexExpr: IExprInstruction;
    private _arrayElementType: IVariableTypeInstruction;
    private _padding: number;

    constructor(pNode: IParseNode, type: ITypeInstruction, usages: string[] = [], 
                writable: boolean = true, readable: boolean = true, 
                arrayIndex: IExprInstruction = null, padding = Instruction.UNDEFINE_PADDING) {
        super(pNode, EInstructionTypes.k_VariableTypeInstruction);

        
        this._usageList = usages;
        this.pushType(type);

        this._isWritable = writable;
        this._isReadable = readable;

        this._isArray = false;
        this._length = Instruction.UNDEFINE_LENGTH;

        this._arrayIndexExpr = null;
        this._arrayElementType = null;
        this._padding = padding;

        this.addArrayIndex(arrayIndex);
    }


    // get fields(): IVariableDeclInstruction[] {
    //     let list = [];
    //     for (let key in this._fields) {
    //         list.push(this._fields[key]);
    //     }
    //     return list;
    // }


    get builtIn(): boolean {
        return false;
    }


    set readable(isReadable: boolean) {
        this._isReadable = isReadable;
    }


    get name(): string {
        return this.baseType.name;
    }


    get realName(): string {
        return this.baseType.realName;
    }


    get hash(): string {
        return this.calcHash();
    }


    get strongHash(): string {
        return this.calcStrongHash();
    }


    get writable(): boolean {
        if (!this._isWritable) {
            return false;
        }

        if ((this.isArray() && !this.isBase()) || this.isUniform()) {
            return false;
        }

        return this.subType.writable;
    }


    get readable(): boolean {
        if (!this._isReadable) {
            return false;
        }

        if (this.hasUsage("out")) {
            return false;
        }

        return this.subType.readable;
    }


    get size(): number {
        if (this._isArray) {
            let iSize: number = this._arrayElementType.size;
            if (this._length === Instruction.UNDEFINE_LENGTH ||
                iSize === Instruction.UNDEFINE_SIZE) {
                return Instruction.UNDEFINE_SIZE;
            }
            else {
                return iSize * this._length;
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
            return 0;
        }

        if (this.isNotBaseArray() && !this._isArray) {
            return this.subType.length;
        }
        else if (this._length === Instruction.UNDEFINE_LENGTH) {
            let isEval: boolean = this._arrayIndexExpr.evaluate();

            if (isEval) {
                let iValue: number = <number>this._arrayIndexExpr.getEvalValue();
                return isNumber(iValue) ? iValue : Instruction.UNDEFINE_LENGTH;
            }
        }

        return this._length;
    }


    get padding(): number {
        return this._padding;
    }


    // for overloading from structers decls
    set padding(val: number) {
        this._padding = val;
    }


    get arrayElementType(): IVariableTypeInstruction {
        if (!this.isArray()) {
            return null;
        }

        return this._arrayElementType;
    }

    get typeDecl(): ITypeDeclInstruction {
        if (!this.isFromTypeDecl()) {
            return null;
        }

        let eParentType: EInstructionTypes = this.parent.instructionType;
        if (eParentType === EInstructionTypes.k_TypeDeclInstruction) {
            return <ITypeDeclInstruction>this.parent;
        }
        return (<ITypeInstruction>this.parent).typeDecl;
    }


    get fieldNames(): string[] {
        return this.subType.fieldNames;
    }


    get usageList(): string[] {
        return this._usageList;
    }


    get subType(): ITypeInstruction {
        return this._subType;
    }


    get fields(): IVariableDeclInstruction[] {
        if (!this.canHaveSubDecls()) {
            return null;
        }
        return this.generateSubDeclList();
    }


    get fullName(): string {
        if (!this.isFromVariableDecl()) {
            return "Not from variable decl";
        }

        let eParentType: EInstructionTypes = this.parent.instructionType;
        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return (<IVariableDeclInstruction>this.parent).fullName;
        }
        return (<IVariableTypeInstruction>this.parent).fullName;
    }


    get varDeclName(): string {
        if (!this.isFromVariableDecl()) {
            return "";
        }

        let eParentType: EInstructionTypes = this.parent.instructionType;

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

        let eParentType: EInstructionTypes = this.parent.instructionType;

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

        let eParentType: EInstructionTypes = this.parent.instructionType;

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

        let pContainerType: IVariableTypeInstruction = <IVariableTypeInstruction>this.parentVarDecl.parent;
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
        return (<IVariableDeclInstruction>this.parentVarDecl);
    }


    toString(): string {
        return this.name || this.subType.toString() || this.hash;
    }


    toCode(): string {
        let code: string = "";
        if (!isNull(this._usageList)) {
            {
                for (let i: number = 0; i < this._usageList.length; i++) {
                    code += this._usageList[i] + " ";
                }
            }
        }

        code += this.subType.toCode();

        return code;
    }


    toDeclString(): string {
        return this.subType.toDeclString();
    }


    isBase(): boolean {
        return this.subType.isBase() && this._isArray === false;
    }


    isArray(): boolean {
        return this._isArray ||
            (this.subType.isArray());
    }


    isNotBaseArray(): boolean {
        return this._isArray || (this.subType.isNotBaseArray());
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
        if (isNull(this.parent)) {
            return false;
        }
        let eParentType: EInstructionTypes = this.parent.instructionType;
        if (eParentType === EInstructionTypes.k_VariableDeclInstruction) {
            return true;
        }
        else if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
            return (<IVariableTypeInstruction>this.parent).isFromVariableDecl();
        }
        return false;
    }

    isFromTypeDecl(): boolean {
        if (isNull(this.parent)) {
            return false;
        }

        let eParentType: EInstructionTypes = this.parent.instructionType;
        if (eParentType === EInstructionTypes.k_TypeDeclInstruction) {
            return true;
        }
        else if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
            return (<IVariableTypeInstruction>this.parent).isFromVariableDecl();
        }

        return false;
    }


    isUniform(): boolean {
        return this.hasUsage("uniform");
    }


    isConst(): boolean {
        return this.hasUsage("const");
    }


    isTypeOfField(): boolean {
        if (isNull(this.parent)) {
            return false;
        }

        if (this.parent.instructionType === EInstructionTypes.k_VariableDeclInstruction) {
            let pParentDecl: IVariableDeclInstruction = <IVariableDeclInstruction>this.parent;
            return pParentDecl.isField();
        }

        return false;
    }


    private pushType(pType: ITypeInstruction): void {
        let eType: EInstructionTypes = pType.instructionType;

        if (eType === EInstructionTypes.k_SystemTypeInstruction ||
            eType === EInstructionTypes.k_ComplexTypeInstruction) {
            this._subType = pType;
        }
        else {
            let pVarType: IVariableTypeInstruction = <IVariableTypeInstruction>pType;
            if (!pVarType.isNotBaseArray()) {
                let pUsageList: string[] = pVarType.usageList;
                if (!isNull(pUsageList)) {
                    for (let i: number = 0; i < pUsageList.length; i++) {
                        this.addUsage(pUsageList[i]);
                    }
                }
                this._subType = pVarType.subType;
            }
            else {
                this._subType = pType;
            }
        }
    }


    private addUsage(sUsage: string): void {
        if (!this.hasUsage(sUsage)) {
            this._usageList.push(sUsage);
        }
    }


    private addArrayIndex(pExpr: IExprInstruction): void {
        if (!pExpr) {
            return;
        }

        //TODO: add support for v[][10]

        this._arrayElementType = new VariableTypeInstruction(null, this.subType, this._usageList.slice());
        this._arrayElementType.parent = this;
        this._arrayIndexExpr = pExpr;

        this._length = this._arrayIndexExpr.evaluate() ? this._arrayIndexExpr.getEvalValue() : Instruction.UNDEFINE_LENGTH;
        this._isArray = true;
    }


    hasField(sFieldName: string): boolean {
        return this.subType.hasField(sFieldName);
    }


    hasFieldWithSematics(sSemantic: string): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasFieldWithSematics(sSemantic);
    }


    hasAllUniqueSemantics(): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasAllUniqueSemantics();
    }


    hasFieldWithoutSemantics(): boolean {
        if (!this.isComplex()) {
            return false;
        }

        return this.subType.hasFieldWithoutSemantics();
    }


    getField(sFieldName: string): IVariableDeclInstruction {
        if (!this.hasField(sFieldName)) {
            return null;
        }

        let pSubField: IVariableDeclInstruction = this.subType.getField(sFieldName);
        let id = pSubField.nameID;
        let type = pSubField.type;
        let padding = pSubField.type.padding;
        let semantics = pSubField.semantics;

        let fieldType: IVariableTypeInstruction = new VariableTypeInstruction(null, type, null, true, true, null, padding);
        let field: IVariableDeclInstruction = new VariableDeclInstruction(null, id, fieldType, null, semantics);

        field.parent = this;
        return field;
    }


    getFieldBySemantics(sSemantic: string): IVariableDeclInstruction {
        if (this.hasFieldWithSematics(sSemantic)) {
            return null;
        }

        let pSubField: IVariableDeclInstruction = this.subType.getFieldBySemantics(sSemantic);

        let padding = pSubField.type.padding;
        let id = pSubField.id;
        let fieldType: IVariableTypeInstruction = new VariableTypeInstruction(null, pSubField.type);
        let field: IVariableDeclInstruction = new VariableDeclInstruction(null, id, fieldType, null);
        field.parent = this;

        return field;
    }


    getFieldType(sFieldName: string): IVariableTypeInstruction {
        return <IVariableTypeInstruction>this.getField(sFieldName).type;
    }


    hasUsage(sUsageName: string): boolean {
        if (isNull(this._usageList)) {
            return false;
        }

        for (let i: number = 0; i < this._usageList.length; i++) {
            if (this._usageList[i] === sUsageName) {
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

        let field: IVariableDeclInstruction = this.getField(sFieldName);
        let pExpr: IIdExprInstruction = new IdExprInstruction(null, field);

        return pExpr;
    }


    getFieldIfExist(sFieldName: string): IVariableDeclInstruction {
        if (this.hasField(sFieldName)) {
            return this.getField(sFieldName);
        }

        return null;
    }


    wrap(): IVariableTypeInstruction {
        var type: IVariableTypeInstruction = new VariableTypeInstruction(null, this);
        return type;
    }


    private calcHash(): string {
        let hash: string = this.subType.hash;
        if (this._isArray) {
            hash += "[";

            const iLength: number = this.length;

            if (iLength === Instruction.UNDEFINE_LENGTH) {
                hash += "undef";
            }
            else {
                hash += iLength.toString();
            }
            hash += "]";
        }
        return hash;
    }


    private calcStrongHash(): string {
        let strongHash: string = this.subType.strongHash;

        if (this._isArray) {
            strongHash += "[";
            const iLength: number = this.length;

            if (iLength === Instruction.UNDEFINE_LENGTH) {
                strongHash += "undef";
            }
            else {
                strongHash += iLength.toString();
            }
            strongHash += "]";
        }
        return strongHash;
    }


    private generateSubDeclList(): IVariableDeclInstruction[] {
        if (!this.canHaveSubDecls()) {
            return;
        }

        let pDeclList: IVariableDeclInstruction[] = [];
        let i: number = 0;

        if (this.isComplex()) {
            let pFieldNameList: string[] = this.fieldNames;

            for (i = 0; i < pFieldNameList.length; i++) {
                const field: IVariableDeclInstruction = this.getField(pFieldNameList[i]);
                const pFieldSubDeclList: IVariableDeclInstruction[] = field.type.fields;

                if (!isNull(pFieldSubDeclList)) {
                    for (let j: number = 0; j < pFieldSubDeclList.length; j++) {
                        pDeclList.push(pFieldSubDeclList[j]);
                    }
                }
            }
        }

        return pDeclList;
    }


    private canHaveSubDecls(): boolean {
        return this.isComplex();
    }
}
