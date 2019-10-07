import { isDef, isNull } from "../../common";
import { IInstructionSettings } from "./Instruction";
import { IVariableDeclInstruction, IInstruction, ITypeInstruction, IVariableTypeInstruction, EInstructionTypes, IIdInstruction, ITypeDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { Instruction } from "./Instruction";
import { IdInstruction } from "./IdInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { VariableDeclInstruction } from "./VariableDeclInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export interface ISystemTypeInstructionSettings extends IInstructionSettings {
    name: string;
    size: number;
    elementType?: ITypeInstruction;
    length?: number;
    fields?: IVariableDeclInstruction[];
    writable?: boolean;
    readable?: boolean;
    builtIn?: boolean;
    declaration?: string;
}

export class SystemTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _size: number;
    protected _elementType: ITypeInstruction;
    protected _length: number;
    protected _fields: IVariableDeclInstruction[];
    protected _bIsWritable: boolean;
    protected _bIsReadable: boolean;
    protected _bBuiltIn: boolean;
    protected _declaration: string;

    constructor({
        name, 
        size = 0,
        elementType = null, 
        length = 1, 
        fields = [],
        writable = true, 
        readable = true, 
        builtIn = true,
        declaration = null, 
        ...settings
    }: ISystemTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SystemTypeInstruction, ...settings });

        this._name = name;
        this._size = size;
        this._elementType = Instruction.$withNoParent(elementType);
        this._length = length;
        this._fields = [];
        this._bIsWritable = writable;
        this._bIsReadable = readable;
        this._declaration = declaration;
        this._bBuiltIn = builtIn;

        fields.forEach(field => this.addField(field));
    }


    get builtIn(): boolean {
        return this._bBuiltIn;
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
        if (this.builtIn) {
            return null;
        }

        return <ITypeDeclInstruction>this.parent;
    }


    get length(): number {
        return this._length;
    }


    get fields(): IVariableDeclInstruction[] {
        return this._fields;
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
        return false;
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


    isSampler(): boolean {
        return this.name === "sampler" ||
            this.name === "sampler2D" ||
            this.name === "samplerCUBE";
    }


    isSamplerCube(): boolean {
        return this.name === "samplerCUBE";
    }


    isSampler2D(): boolean {
        return this.name === "sampler" ||
            this.name === "sampler2D";
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
        return this._fields.find(field => field.name == fieldName) || null;
    }


    getFieldBySemantics(sSemantic: string): IVariableDeclInstruction {
        console.error("@undefined_behavior");
        return null;
    }


    addField(field: IVariableDeclInstruction): void {
        console.assert(this.getField(field.name) === null);
        this._fields.push(Instruction.$withParent(field, this));
    }
}

