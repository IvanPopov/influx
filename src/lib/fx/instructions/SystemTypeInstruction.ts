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
    protected _elementType: ITypeInstruction;
    protected _length: number;
    protected _fields: IVariableDeclInstruction[];
    protected _bIsWritable: boolean;
    protected _bIsReadable: boolean;
    protected _bBuiltIn: boolean;
    protected _declaration: string;

    // just a cache
    protected _variableTypeWrapper: IVariableTypeInstruction;

    constructor({
        name, 
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
        this._elementType = Instruction.$withNoParent(elementType);
        this._length = length;
        this._fields = fields.map(field => field.$withParent(this));
        this._bIsWritable = writable;
        this._bIsReadable = readable;
        this._declaration = declaration;
        this._bBuiltIn = builtIn;

        this._variableTypeWrapper = new VariableTypeInstruction({ type: this });
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
        return this.arrayElementType.size * this.length;
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
        let pList = [];
        for (let key in this._fields) {
            pList.push(this._fields[key]);
        }
        return pList;
    }


    get fieldNames(): string[] {
        let pList = [];
        for (let key in this._fields) {
            pList.push(key);
        }
        return pList;
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


    hasField(sFieldName: string): boolean {
        return isDef(this._fields[sFieldName]);
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


    getField(sFieldName: string): IVariableDeclInstruction {
        return isDef(this._fields[sFieldName]) ? this._fields[sFieldName] : null;
    }


    getFieldBySemantics(sSemantic: string): IVariableDeclInstruction {
        return null;
    }


    getFieldType(sFieldName: string): IVariableTypeInstruction {
        return isDef(this._fields[sFieldName]) ? this._fields[sFieldName].type : null;
    }


    getFieldNameList(): string[] {
        return this._fields.map(field => field.name);
    }

    asVarType(): IVariableTypeInstruction {
        return this._variableTypeWrapper;
    }
}

