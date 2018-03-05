import { isDef, isNull } from "../../common";
import { IVariableDeclInstruction, IInstruction, ITypeInstruction, IVariableTypeInstruction, EInstructionTypes, IIdInstruction, ITypeDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { Instruction } from "./Instruction";
import { IdInstruction } from "./IdInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export class SystemTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _realName: string;
    protected _elementType: ITypeInstruction;
    protected _length: number;
    protected _fields: IVariableDeclInstruction[];

    protected _bIsWritable: boolean;
    protected _bIsReadable: boolean;

    protected _declaration: string;

    protected _variableTypeWrapper: IVariableTypeInstruction;

    constructor(name: string, realName: string, elemType: ITypeInstruction = null, 
                length: number = 1, fields: IVariableDeclInstruction[] = [], 
                writable: boolean = true, readable: boolean = true, declaration: string = '') {
        super(null, EInstructionTypes.k_SystemTypeInstruction);

        this._name = name;
        this._realName = realName;
        this._elementType = elemType;
        this._length = length;
        this._fields = fields;
        this._bIsWritable = writable;
        this._bIsReadable = readable;
        this._declaration = declaration;

        this._variableTypeWrapper = new VariableTypeInstruction(null, this);
    }

    
    get builtIn(): boolean {
        return true;
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

    
    get realName(): string {
        return this._realName;
    }

    
    get hash(): string {
        return this._realName;
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

    
    get variableType(): IVariableTypeInstruction {
        return this._variableTypeWrapper;
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
        return this._realName;
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
        return this._fields.map( field => field.name );
    }
}

