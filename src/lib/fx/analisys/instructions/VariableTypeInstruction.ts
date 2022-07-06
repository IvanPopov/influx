import { assert, isDefAndNotNull, isNull, isNumber } from "@lib/common";
import { instruction, type } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IExprInstruction, IFunctionDeclInstruction, ILiteralInstruction, IScope, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IVariableUsage } from '@lib/idl/IInstruction';

import { IInstructionSettings, Instruction } from "./Instruction";

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
    protected _aligment: number;

    constructor({ type, usages = [], arrayIndex = null, writable = true, readable = true, padding = instruction.UNDEFINE_PADDING, ...settings }: IVariableTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableType, ...settings });

        type = type.$withNoParent();
        this._usageList = [];

        let instrType = type.instructionType;
        if (instrType === EInstructionTypes.k_ProxyType ||
            instrType === EInstructionTypes.k_SystemType ||
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
        this._aligment = 1;

        if (arrayIndex) {
            // todo: add support for v[][10]
            // todo: move elements construction to analyzer, don't make it implicitly
            this._arrayElementType = Instruction.$withParent(new VariableTypeInstruction({ readable, writable, scope: this.scope, type: this.subType, usages: this._usageList }), this);
            this._arrayIndexExpr = Instruction.$withParent(arrayIndex, this);
        } 
        // todo: array element type must be constructed with proper usages and read/write flags!
        // else if (this.isArray()) {
        //     this._arrayElementType = Instruction.$withParent(new VariableTypeInstruction({ readable, writable, scope: this.scope, type: type.arrayElementType, usages: this._usageList }), this);
        // }

        usages.forEach(usage => this.addUsage(usage));
    }


    get name(): string {
        return this.baseType.name;
    }


    get writable(): boolean {
        if (!this._isWritable) {
            return false;
        }

        if (/*(this.isArray() && !this.isBase()) || */this.isUniform()) {
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


    get aligment(): number {
        return this._aligment;
    }

    // TODO: move to helpers
    get size(): number {
        if (!isNull(this._arrayElementType)) {
            const size = type.alignSize(this._arrayElementType.size, this.aligment);
            const length = this.length;
            if (length === instruction.UNDEFINE_LENGTH || size === instruction.UNDEFINE_SIZE) {
                return instruction.UNDEFINE_SIZE;
            }
            return size * length;
        }
        return type.alignSize(this.subType.size, this.aligment);
    }


    get baseType(): ITypeInstruction {
        return this.subType.baseType;
    }


    get length(): number {
        if (!this.isNotBaseArray()) { // not a user defined array like arr[10]
            // for ex. if type is float3x4 then length is 3
            return this.subType.length;
        }

        // IP: arrays like float[]?
        if (this.isNotBaseArray() && isNull(this._arrayElementType)) {
            return this.subType.length;
        }

        // arrays like float[10]
        const expr = this._arrayIndexExpr;
        if (instruction.isLiteral(expr)) {
            return Number((<ILiteralInstruction<number>>expr).value);
        }

        // arrays like float[N];
        // TODO: try to evaluate this._arrayIndexExpr
        return instruction.UNDEFINE_LENGTH;
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
        return this.name || this.subType.toString() || type.hash(this);
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
    isEqual(value: ITypeInstruction): boolean {
        return type.equals(this, value);
    }

    /** @deprecated */
    toDeclString(): string {
        return this.subType.toDeclString();
    }

    // base type is the same as system types like: float, bool, float2x2
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


    isSampler(): boolean {
        return !this.isNotBaseArray() && this.subType.isSampler();
    }


    isTexture(): boolean {
        return !this.isNotBaseArray() && this.subType.isTexture();
    }


    isUAV(): boolean {
        return !this.isNotBaseArray() && this.subType.isUAV();
    }


    $overwritePadding(padding: number, aligment: number) {
        this._padding = padding;
        this._aligment = aligment;
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
        // TODO: propogate usages? atleast readable/writable
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


    /**
     * Helpers
     */

    // TODO: move to type.ts
    /** @deprecated */
    static wrap(type: ITypeInstruction, scope: IScope): IVariableTypeInstruction {
        return new VariableTypeInstruction({ type, scope });
    }

    // TODO: move to type.ts
    /** @deprecated */
    static wrapAsConst(type: ITypeInstruction, scope: IScope): IVariableTypeInstruction {
        return new VariableTypeInstruction({ type, scope, writable: false, usages: ['const'] });
    }
}
