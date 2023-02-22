import { assert, isDefAndNotNull, isNull, isNumber } from "@lib/common";
import { instruction, types } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IArithmeticExprInstruction, IExprInstruction, IFunctionDeclInstruction, IIdExprInstruction, IInstruction, ILiteralInstruction, IScope, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IVariableUsage } from '@lib/idl/IInstruction';

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IVariableTypeInstructionSettings extends IInstructionSettings {
    type: ITypeInstruction;
    usages?: IVariableUsage[];
    arrayIndex?: IExprInstruction;
    padding?: number;

    readable?: boolean;
    writable?: boolean;
}

function evaluateValue(val: IInstruction) {
    if (!val) return 0;
    if (instruction.isLiteral(val)) return (<ILiteralInstruction<number>>val).value;
    if (val.instructionType === EInstructionTypes.k_IdExpr) {
        const idExpr = (<IIdExprInstruction>val);
        if (idExpr.decl.isGlobal()) { // and is constant?
            return evaluateConsExpr(idExpr.decl.initExpr?.args?.[0]);
        }
    }
    return -1;
}

// simples possible evalator for minimal compartibility
function evaluateConsExpr(expr: IExprInstruction): number
{
    const val = evaluateValue(expr);
    if (val >= 0) return val;

    if (expr.instructionType !== EInstructionTypes.k_ArithmeticExpr) return -1;
    const { left, right, operator } = <IArithmeticExprInstruction>expr;
    
    let lval = evaluateConsExpr(left);
    let rval = evaluateConsExpr(right);
    
    if (lval >= 0 && rval >= 0) {
        switch (operator) {
            // todo: use round ? check if integers only
            case '*': return rval * lval;
            case '/': return rval / lval;
            case '+': return rval + lval;
            case '-': return rval - lval;
            default:
                console.error('unsupported operator');
        }
    }

    return -1;
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

        // check for usages.includes('in') ?

        return this.subType.writable;
    }


    get readable(): boolean {
        if (!this._isReadable) {
            return false;
        }

        if (this.usages.includes("out")) {
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
            const size = types.alignSize(this._arrayElementType.size, this.aligment);
            const length = this.length;
            if (length === instruction.UNDEFINE_LENGTH || size === instruction.UNDEFINE_SIZE) {
                return instruction.UNDEFINE_SIZE;
            }
            return size * length;
        }
        // return type.alignSize(this.subType.size, this.aligment);
        return this.subType.size;
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
        const len = evaluateConsExpr(expr);
        return len < 0 ? instruction.UNDEFINE_LENGTH: len;
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


    get usages(): IVariableUsage[] {
        let usages =  [ ...this._usageList ];
        let subType = this.subType;
        while (subType && subType.instructionType === EInstructionTypes.k_VariableType) {
            const vtype = <IVariableTypeInstruction>subType;
            // todo: remove duplicates
            usages = [ ...usages, ...vtype.usages ];
            subType = vtype.subType;
        }

        return usages;
    }


    get subType(): ITypeInstruction {
        return this._subType;
    }


    get fields(): IVariableDeclInstruction[] {
        return this.subType.fields;
    }


    toString(): string {
        // TODO: fix this condition
        return this.name || this.subType.toString() || types.hash(this);
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


    isUniform(): boolean {
        return this.usages.includes("uniform");
    }


    isConst(): boolean {
        return this.usages.includes("const");
    }


    isUnsigned(): boolean {
        return this.usages.includes("unsigned");
    }


    isStatic(): boolean {
        return this.usages.includes("static");
    }


    $overwritePadding(padding: number, aligment: number) {
        this._padding = padding;
        this._aligment = aligment;
    }
    

    private addUsage(usage: IVariableUsage): void {
        if (!this.usages.includes(usage)) {
            this._usageList.push(usage);
        }
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
