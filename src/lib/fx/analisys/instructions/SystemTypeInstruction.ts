import { isNull } from "@lib/common";
import { EInstructionTypes, IFunctionDeclInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface ISystemTypeInstructionSettings extends IInstructionSettings {
    name: string;
    size: number;
    elementType?: ITypeInstruction;
    length?: number;
    fields?: IVariableDeclInstruction[];
    methods?: IFunctionDeclInstruction[];
    writable?: boolean;
    readable?: boolean;
    declaration?: string;
    complex?: boolean;
}

export class SystemTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _size: number;
    protected _elementType: ITypeInstruction;
    protected _length: number;
    protected _fields: IVariableDeclInstruction[];
    protected _methods: IFunctionDeclInstruction[];
    protected _bIsWritable: boolean;
    protected _bIsReadable: boolean;
    protected _bIsComplex: boolean;
    protected _declaration: string;

    constructor({
        name, 
        size = 0,
        elementType = null, 
        length = 1, 
        fields = [],
        methods = [],
        writable = true, 
        readable = true, 
        complex = false,
        declaration = null, 
        ...settings
    }: ISystemTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemType, ...settings });

        this._name = name;
        this._size = size;
        this._elementType = Instruction.$withNoParent(elementType);
        this._length = length;
        this._fields = [];
        this._methods = [];
        this._bIsWritable = writable;
        this._bIsReadable = readable;
        this._bIsComplex = complex;
        this._declaration = declaration;

        fields.forEach(field => this.addField(field));
        methods.forEach(method => this.addMethod(method));
    }


    get writable(): boolean {
        return this._bIsWritable;
    }


    get readable(): boolean {
        return this._bIsReadable;
    }


    set name(sName: string) {
        this._name = sName;
    }


    get name(): string {
        return this._name;
    }


    get hash(): string {
        return this._name;
    }


    get strongHash(): string {
        return this._name;
    }


    get size(): number {
        if (this.isArray()) {
            return this.arrayElementType.size * this.length;
        }
        return this._size;
    }


    get baseType(): ITypeInstruction {
        return this;
    }


    get arrayElementType(): ITypeInstruction {
        return this._elementType;
    }


    get typeDecl(): ITypeDeclInstruction {
        return <ITypeDeclInstruction>this.parent;
    }


    get length(): number {
        return this._length;
    }


    get fields(): IVariableDeclInstruction[] {
        return this._fields;
    }


    get methods(): IFunctionDeclInstruction[] {
        return this._methods;
    }


    get fieldNames(): string[] {
        return this._fields.map(field => field.name);
    }


    isBase(): boolean {
        return true;
    }


    isArray(): boolean {
        return !isNull(this.arrayElementType);
    }


    isNotBaseArray(): boolean {
        return false;
    }


    isComplex(): boolean {
        return this._bIsComplex;
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


    isContainArray(): boolean {
        return false;
    }


    isContainSampler(): boolean {
        return false;
    }


    isContainPointer(): boolean {
        return false;
    }


    isContainComplexType(): boolean {
        return false;
    }


    toString(): string {
        return this.name || this.hash;
    }


    toDeclString(): string {
        return this._declaration;
    }


    toCode(): string {
        return this._name;
    }


    hasField(fieldName: string): boolean {
        return !!this.getField(fieldName);
    }


    hasFieldWithSematics(sSemantic: string): boolean {
        return false;
    }


    hasAllUniqueSemantics(): boolean {
        return false;
    }


    hasFieldWithoutSemantics(): boolean {
        return false;
    }


    getField(fieldName: string): IVariableDeclInstruction {
        return this._fields.find(field => field.name === fieldName) || null;
    }


    getMethod(methodName: string): IFunctionDeclInstruction[] {
        return this._methods.filter(method => method.name === methodName) || null;
    }


    getFieldBySemantics(semantic: string): IVariableDeclInstruction {
        console.error("@undefined_behavior");
        return null;
    }


    addField(field: IVariableDeclInstruction): void {
        console.assert(this.getField(field.name) === null);
        this._fields.push(Instruction.$withParent(field, this));
    }

    addMethod(method: IFunctionDeclInstruction): void {
        console.assert(this.getMethod(method.name).find(knownMethod => knownMethod.def.signature === method.def.signature) === null);
        this._methods.push(Instruction.$withParent(method, this));
    }
}

