import { assert, isDefAndNotNull, isNull, isNumber } from "@lib/common";
import { EInstructionTypes, IExprInstruction, IFunctionDeclInstruction, IScope, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IVariableUsage } from '@lib/idl/IInstruction';

import { IdInstruction } from "./IdInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { VariableDeclInstruction } from "./VariableDeclInstruction";

export interface IVariableTypeInstructionSettings extends IInstructionSettings {
    type: ITypeInstruction;
    usages?: IVariableUsage[];
    arrayIndex?: IExprInstruction;
    padding?: number;

    readable?: boolean;
    writable?: boolean;
}


export class VariableTypeInstruction extends Instruction implements IVariableTypeInstruction {
    protected _subType: ITypeInstruction;
    protected _usageList: IVariableUsage[];

    /** overrites for defautl read/write tests (for internal usage) */
    protected _isWritable: boolean;
    protected _isReadable: boolean;

    protected _arrayIndexExpr: IExprInstruction;
    protected _arrayElementType: IVariableTypeInstruction;
    protected _padding: number;

    constructor({ type, usages = [], arrayIndex = null, writable = true, readable = true, padding = Instruction.UNDEFINE_PADDING, ...settings }: IVariableTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableType, ...settings });

        type = type.$withNoParent();
        this._usageList = [];

        let instrType = type.instructionType;
        if (instrType === EInstructionTypes.k_SystemType ||
            instrType === EInstructionTypes.k_ComplexType) {
            this._subType = type;
        }
        else {
            let varType = <IVariableTypeInstruction>type;
            // TODO: review this code
            if (!varType.isNotBaseArray()) {
                this._subType = varType.subType;
                varType.usages.forEach(usage => this.addUsage(usage))
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
        this._padding = padding;

        if (arrayIndex) {
            //TODO: add support for v[][10]
            this._arrayElementType = Instruction.$withParent(new VariableTypeInstruction({ scope: this.scope, type: this.subType, usages: this._usageList }), this);
            this._arrayIndexExpr = Instruction.$withParent(arrayIndex, this);
        }

        usages.forEach(usage => this.addUsage(usage));

        // todo: construct arrayElementType here! with proper usages!
        // if (this.isArray()) {
        //     if (isNull(this._arrayElementType)) {
        //         this._arrayElementType = Instruction.$withParent(new VariableTypeInstruction({ scope: this.scope, type: this.subType.arrayElementType, usages: this.usageList }), this);
        //     }
        // }
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

        if (this.isConst()) {
            return false;
        }

        // check for hasUsage('in') ?

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


    get methods(): IFunctionDeclInstruction[] {
        return this.subType.methods;
    }


    get size(): number {
        if (!isNull(this._arrayElementType)) {
            const size = this._arrayElementType.size;
            const length = this.length;
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

        // TODO: rework evaluation api!

        let isEval = this._arrayIndexExpr.evaluate();

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


    get arrayElementType(): IVariableTypeInstruction {
        if (!this.isArray()) {
            return null;
        }

        // todo: fix this.subType.arrayElementType!
        return this._arrayElementType || <IVariableTypeInstruction>this.subType.arrayElementType;
    }



    get fieldNames(): string[] {
        return this.subType.fieldNames;
    }


    get usages(): IVariableUsage[] {
        return this._usageList;
    }


    get subType(): ITypeInstruction {
        return this._subType;
    }


    get fields(): IVariableDeclInstruction[] {
        return this.subType.fields;
    }


    toString(): string {
        // TODO: fix this condition
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


    /** @deprecated */
    toDeclString(): string {
        return this.subType.toDeclString();
    }

    // todo: add explanation!
    isBase(): boolean {
        return this.subType.isBase() && isNull(this._arrayElementType);
    }


    isArray(): boolean {
        return !isNull(this._arrayElementType) || this.subType.isArray();
    }


    // Returns true if the type is user defined array.
    // like an ordinary array: int a[5]
    // not a base array like: float4/int3 etc.
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


    /** @deprecated */
    isContainArray(): boolean {
        return this.subType.isContainArray();
    }


    /** @deprecated */
    isContainSampler(): boolean {
        return this.subType.isContainSampler();
    }


    /** @deprecated */
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


    private addUsage(usage: IVariableUsage): void {
        if (!this.hasUsage(usage)) {
            this._usageList.push(usage);
        }
    }


    hasField(fieldName: string): boolean {
        return this.subType.hasField(fieldName);
    }


    hasFieldWithSematics(semantic: string): boolean {
        return this.subType.hasFieldWithSematics(semantic);
    }


    hasAllUniqueSemantics(): boolean {
        return this.subType.hasAllUniqueSemantics();
    }


    hasFieldWithoutSemantics(): boolean {
        return this.subType.hasFieldWithoutSemantics();
    }


    getField(fieldName: string): IVariableDeclInstruction {
        // TODO: propogate usages?
        return this.subType.getField(fieldName);
    }


    getMethod(methodName: string, args?: ITypeInstruction[]): IFunctionDeclInstruction {
        return this.subType.getMethod(methodName, args);
    }


    getFieldBySemantics(semantic: string): IVariableDeclInstruction {
        // TODO: propogate usages?
        return this.subType.getFieldBySemantics(semantic);
    }


    hasUsage(usage: IVariableUsage): boolean {
        if (this._usageList.find(knownUsage => knownUsage === usage)) {
            return true;
        }

        if (!isNull(this.subType) && this.subType.instructionType === EInstructionTypes.k_VariableType) {
            return (<IVariableTypeInstruction>this.subType).hasUsage(usage);
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

    /**
     * Helpers
     */


    static wrap(type: ITypeInstruction, scope: IScope): IVariableTypeInstruction {
        return new VariableTypeInstruction({ type, scope });
    }

    static wrapAsConst(type: ITypeInstruction, scope: IScope): IVariableTypeInstruction {
        return new VariableTypeInstruction({ type, scope, writable: false, usages: ['const'] });
    }
}
