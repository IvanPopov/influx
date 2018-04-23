import { Instruction, IInstructionSettings } from "./Instruction";
import { isDefAndNotNull } from "./../../common";
import { assert } from "./../../common";
import { IVariableTypeInstruction, ITypeInstruction, IExprInstruction, IVariableDeclInstruction, EInstructionTypes, IIdInstruction, ITypeDeclInstruction, IIdExprInstruction, IInstruction, IScope } from '../../idl/IInstruction';
import { IMap } from "../../idl/IMap";
import { isNull, isNumber, isDef } from '../../common';
import { IdInstruction } from "./IdInstruction";
import { VariableDeclInstruction } from "./VariableDeclInstruction";
import { IntInstruction } from "./IntInstruction";
import { IdExprInstruction } from "./IdExprInstruction"
import * as Effect from "../Effect"
import { IParseNode } from "../../idl/parser/IParser";


export interface IVariableTypeInstructionSettings extends IInstructionSettings {
    type: ITypeInstruction;
    usages?: string[];
    arrayIndex?: IExprInstruction;
    writable?: boolean;
    readable?: boolean;
}


export class VariableTypeInstruction extends Instruction implements IVariableTypeInstruction {
    protected _subType: ITypeInstruction;
    protected _usageList: string[];

    /** overrites for defautl read/write tests */
    protected _isWritable: boolean;
    protected _isReadable: boolean;

    protected _arrayIndexExpr: IExprInstruction;
    protected _arrayElementType: IVariableTypeInstruction;
    protected _padding: number;

    constructor({ type, usages = null, arrayIndex = null, writable = true, readable = true, ...settings }: IVariableTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableTypeInstruction, ...settings });

        type = type.$withNoParent();
        this._usageList = [];

        let instrType: EInstructionTypes = type.instructionType;
        if (instrType === EInstructionTypes.k_SystemTypeInstruction ||
            instrType === EInstructionTypes.k_ComplexTypeInstruction) {
            this._subType = type;
        }
        else {
            let varType = <IVariableTypeInstruction>type;
            // todo: review this code
            if (!varType.isNotBaseArray()) {
                this._subType = varType.subType;
                varType.usageList.forEach( usage => this.addUsage(usage) )
            }
            else {
                this._subType = type;
            }
        }

        assert(isDefAndNotNull(this._subType));
        assert(isDefAndNotNull(this._usageList));

        this._isWritable = writable;
        this._isReadable = readable;

        this._arrayIndexExpr = null;
        this._arrayElementType = null;
        this._padding = Instruction.UNDEFINE_PADDING;

        if (arrayIndex) {
            //TODO: add support for v[][10]
            this._arrayElementType = (new VariableTypeInstruction({ scope: this.scope, type: this.subType, usages: this._usageList })).$withParent(this);
            this._arrayIndexExpr = arrayIndex.$withParent(this);
        }

        (usages || []).forEach( usage => this.addUsage(usage) );
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
        if (!isNull(this._arrayElementType)) {
            let size: number = this._arrayElementType.size;
            let length: number = this.length;
            if (length === Instruction.UNDEFINE_LENGTH || size === Instruction.UNDEFINE_SIZE) {
                return Instruction.UNDEFINE_SIZE;
            }

            return size * length;
        }

        return this.subType.size;
    }


    get baseType(): ITypeInstruction {
        return this.subType.baseType;
    }


    get length(): number {
        if (!this.isNotBaseArray()) {
            return 0;
        }

        if (this.isNotBaseArray() && isNull(this._arrayElementType)) {
            return this.subType.length;
        }
        
        let isEval: boolean = this._arrayIndexExpr.evaluate();

        if (isEval) {
            let iValue: number = <number>this._arrayIndexExpr.getEvalValue();
            if (isNumber(iValue)) {
                return iValue;
            }
        }

        return Instruction.UNDEFINE_LENGTH;
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


    toString(): string {
        return this.name || this.subType.toString() || this.hash;
    }


    toCode(): string {
        let code: string = "";
        if (!isNull(this._usageList)) {
            for (let i: number = 0; i < this._usageList.length; i++) {
                code += this._usageList[i] + " ";
            }
        }

        code += this.subType.toCode();

        return code;
    }


    toDeclString(): string {
        return this.subType.toDeclString();
    }


    isBase(): boolean {
        return this.subType.isBase() && isNull(this._arrayElementType);
    }


    isArray(): boolean {
        return !isNull(this._arrayElementType) || this.subType.isArray();
    }


    isNotBaseArray(): boolean {
        return !isNull(this._arrayElementType) || this.subType.isNotBaseArray();
    }


    isComplex(): boolean {
        return this.subType.isComplex();
    }


    isEqual(type: ITypeInstruction): boolean {
        if (this.isNotBaseArray() && type.isNotBaseArray() &&
            (this.length !== type.length ||
                this.length === Instruction.UNDEFINE_LENGTH ||
                type.length === Instruction.UNDEFINE_LENGTH)) {
            return false;
        }

        if (this.hash !== type.hash) {
            return false;
        }

        return true;
    }


    isStrongEqual(type: ITypeInstruction): boolean {
        if (!this.isEqual(type) || this.strongHash !== type.strongHash) {
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


    isUniform(): boolean {
        return this.hasUsage("uniform");
    }


    isConst(): boolean {
        return this.hasUsage("const");
    }


    $overwritePadding(val: number) {
        this._padding = val;
    }


    private addUsage(sUsage: string): void {
        if (!this.hasUsage(sUsage)) {
            this._usageList.push(sUsage);
        }
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

        const scope = this.scope;

        let subField = this.subType.getField(sFieldName);
        let id = subField.id;
        let type = subField.type;
        let padding = subField.type.padding;
        let semantics = subField.semantics;

        let fieldType: IVariableTypeInstruction = new VariableTypeInstruction({ scope, type });
        fieldType.$overwritePadding(padding);

        let field: IVariableDeclInstruction = new VariableDeclInstruction({ scope, id, type: fieldType, semantics });
        return field.$withParent(this);
    }


    getFieldBySemantics(sSemantic: string): IVariableDeclInstruction {
        if (this.hasFieldWithSematics(sSemantic)) {
            return null;
        }

        let subField: IVariableDeclInstruction = this.subType.getFieldBySemantics(sSemantic);

        // todo: review this code!

        const scope = this.scope;

        let padding = subField.type.padding;
        let id = subField.id;
        let fieldType: IVariableTypeInstruction = new VariableTypeInstruction({ scope, type: subField.type });
        let field: IVariableDeclInstruction = new VariableDeclInstruction({ scope, id, type: fieldType });
        return field.$withParent(this);
    }


    hasUsage(sUsageName: string): boolean {
        for (let i = 0; i < this._usageList.length; i++) {
            if (this._usageList[i] === sUsageName) {
                return true;
            }
        }

        if (!isNull(this.subType) && this.subType.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
            return (<IVariableTypeInstruction>this.subType).hasUsage(sUsageName);
        }

        return false;
    }


    private calcHash(): string {
        let hash: string = this.subType.hash;
        if (!isNull(this._arrayElementType)) {
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

        if (this.isArray()) {
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
            return [];
        }

        let declList: IVariableDeclInstruction[] = [];
        let i: number = 0;

        if (this.isComplex()) {
            let fieldNameList = this.fieldNames;

            for (i = 0; i < fieldNameList.length; i++) {
                const field: IVariableDeclInstruction = this.getField(fieldNameList[i]);
                const fieldSubDeclList = field.type.fields;

                if (!isNull(fieldSubDeclList)) {
                    for (let j: number = 0; j < fieldSubDeclList.length; j++) {
                        declList.push(fieldSubDeclList[j]);
                    }
                }
            }
        }

        return declList;
    }


    private canHaveSubDecls(): boolean {
        return this.isComplex();
    }

    
    /**
     * Helpers
     */

    // todo: rename it
    static isInheritedFromVariableDecl(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }
        let parentType: EInstructionTypes = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDeclInstruction) {
            return true;
        }
        else if (parentType === EInstructionTypes.k_VariableTypeInstruction) {
            return VariableTypeInstruction.isInheritedFromVariableDecl(<IVariableTypeInstruction>type.parent);
        }
        return false;
    }


    static isTypeOfField(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }

        if (type.parent.instructionType === EInstructionTypes.k_VariableDeclInstruction) {
            let pParentDecl: IVariableDeclInstruction = <IVariableDeclInstruction>type.parent;
            return pParentDecl.isField();
        }

        return false;
    }


    static findParentContainer(type: IVariableTypeInstruction): IVariableDeclInstruction {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(type) || !VariableTypeInstruction.isTypeOfField(type)) {
            return null;
        }

        let containerType: IVariableTypeInstruction = <IVariableTypeInstruction>VariableTypeInstruction.findParentVariableDecl(type).parent;
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(containerType)) {
            return null;
        }

        return VariableTypeInstruction.findParentVariableDecl(containerType);
    }


    static findParentVariableDecl(type: ITypeInstruction): IVariableDeclInstruction {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType: EInstructionTypes = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDeclInstruction) {
            return <IVariableDeclInstruction>type.parent;
        }

        return VariableTypeInstruction.findParentVariableDecl(<IVariableTypeInstruction>type.parent);
    }


    static findParentVariableDeclName(type: ITypeInstruction): string {
        let varDecl = VariableTypeInstruction.findParentVariableDecl(type)
        return isNull(varDecl) ? null : varDecl.name;
    }



    static finParentTypeDecl(type: ITypeInstruction): ITypeDeclInstruction {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType: EInstructionTypes = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_TypeDeclInstruction) {
            return <ITypeDeclInstruction>type.parent;
        }
        return VariableTypeInstruction.finParentTypeDecl(<ITypeInstruction>type.parent);
    }


    static finParentTypeDeclName(type: IVariableTypeInstruction): string {
        let typeDecl = VariableTypeInstruction.finParentTypeDecl(type);
        return isNull(typeDecl) ? null : typeDecl.name;
    }


    static resolveVariableDeclFullName(type: ITypeInstruction): string {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(type)) {
            console.error("Not from variable decl");
            return null;
        }

        return VariableTypeInstruction.findParentVariableDecl(type).fullName;
    }


    // todo: add comment
    // todo: review this code
    static findMainVariable(type: ITypeInstruction): IVariableDeclInstruction {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(type)) {
            return null;
        }

        if (VariableTypeInstruction.isTypeOfField(type)) {
            return VariableTypeInstruction.findMainVariable(<IVariableTypeInstruction>type.parent.parent);
        }
        return VariableTypeInstruction.findParentVariableDecl(type);
    }


    static wrap(type: ITypeInstruction, scope: IScope): IVariableTypeInstruction {
        return new VariableTypeInstruction({ type, scope: scope });
    }


    static fieldToExpr(type: IVariableTypeInstruction, fieldName: string): IIdExprInstruction {
        if (!type.hasField(fieldName)) {
            return null;
        }

        var field = type.getField(fieldName);
        var expr = new IdExprInstruction({ scope: null, id: field.id, decl: field });

        return expr;
    }
}
