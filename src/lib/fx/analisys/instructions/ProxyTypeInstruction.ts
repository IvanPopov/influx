import { isNull } from "@lib/common";
import { EInstructionTypes, IFunctionDeclInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { instruction, type } from "../helpers";
import { IInstructionSettings, Instruction } from "./Instruction";

export class ProxyTypeInstruction extends Instruction implements ITypeInstruction {
    protected _host: ITypeInstruction;

    constructor(settings: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ProxyType, ...settings });
        this._host = null;
    }

    get host(): ITypeInstruction {
        return this._host;
    }
    
    get writable(): boolean {
        return this.isResolved() ? this.host.writable : true;
    }

    
    get readable(): boolean {
        return this.isResolved() ? this.host.writable : true;
    }

    
    get name(): string {
        return this.isResolved() ? this.host.name : 'auto';
    }

    
    get size(): number {
        return this.isResolved() ? this.host.size : instruction.UNDEFINE_SIZE;
    }


    get baseType(): ITypeInstruction {
        return this.host;
    }

    
    get arrayElementType(): ITypeInstruction {
        return this.isResolved() ? this.host.arrayElementType : null;
    }

    
    get typeDecl(): ITypeDeclInstruction {
        return <ITypeDeclInstruction>this.parent;
    }

    
    get length(): number {
        return this.isResolved() ? this.host.length : instruction.UNDEFINE_LENGTH;
    }

    
    get fieldNames(): string[] {
        return this.isResolved() ? this.host.fieldNames : [];
    }

    
    get fields(): IVariableDeclInstruction[] {
        return this.isResolved() ? this.host.fields : [];
    }


    get methods(): IFunctionDeclInstruction[] {
        return [];
    }


    isResolved(): boolean {
        return !isNull(this.host);
    }


    resolve(host: ITypeInstruction) {
        this._host = host;
    }

    isSampler(): boolean {
        return this.isResolved() ? this.host.isSampler() : false;
    }

    isTexture(): boolean {
        return this.isResolved() ? this.host.isTexture() : false;
    }

    isUAV(): boolean {
        return this.isResolved() ? this.host.isUAV() : false;
    }

    isBuffer(): boolean {
        return this.isResolved() ? this.host.isBuffer() : false;
    }
    
    toString(): string {
        return this.isResolved() ? this.host.toString() : this.name;
    }

    /** @deprecated */
    toDeclString(): string {
        return this.isResolved() ? this.host.toDeclString() : null;
    }


    /** @deprecated */
    isEqual(value: ITypeInstruction): boolean {
        return type.equals(this, value);
    }

    
    toCode(): string {
        return this.isResolved() ? this.host.toCode() : this.name;
    }

    
    isBase(): boolean {
        return this.isResolved() ? this.host.isBase() : false;
    }

    
    isArray(): boolean {
        return this.isResolved() ? this.host.isArray() : false;
    }

    
    isNotBaseArray(): boolean {
        return this.isResolved() ? this.host.isNotBaseArray() : false;
    }

    
    isComplex(): boolean {
        return this.isResolved() ? this.host.isComplex() : false;
    }

    
    isConst(): boolean {
        return this.isResolved() ? this.host.isConst() : false;
    }

    
    /** @deprecated */
    isContainArray(): boolean {
        return this.isResolved() ? this.host.isContainArray() : false;
    }

    
    /** @deprecated */
    isContainSampler(): boolean {
        return this.isResolved() ? this.host.isContainSampler() : false;
    }

    /** @deprecated */
    isContainComplexType(): boolean {
        return this.isResolved() ? this.host.isContainComplexType() : false;
    }

    hasField(fieldName: string): boolean {
        return this.isResolved() ? this.host.hasField(fieldName) : false;
    }


    hasFieldWithSematics(semantic: string): boolean {
        return this.isResolved() ? this.host.hasFieldWithSematics(semantic) : false;
    }


    getField(fieldName: string): IVariableDeclInstruction {
        return this.isResolved() ? this.host.getField(fieldName) : null;
    }


    getMethod(methodName: string, args?: ITypeInstruction[]): IFunctionDeclInstruction {
        return this.isResolved() ? this.host.getMethod(methodName, args) : null;
    }


    getFieldBySemantics(semantic: string): IVariableDeclInstruction {
        return this.isResolved() ? this.host.getFieldBySemantics(semantic) : null;
    }

    hasFieldWithoutSemantics(): boolean {
        return this.isResolved() ? this.host.hasFieldWithoutSemantics() : false;
    }


    hasAllUniqueSemantics(): boolean {
        return this.isResolved() ? this.host.hasAllUniqueSemantics() : false;
    }
}
