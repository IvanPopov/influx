import { isNull } from "@lib/common";
import { fn, instruction, types } from '@lib/fx/analisys/helpers';
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

    constructor({
        name, 
        size = 0,
        elementType = null, 
        length = 1, 
        fields = [],
        methods = [],
        writable = true, 
        readable = true, 
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
        fields.forEach(field => this.addField(field));
        methods.forEach(method => this.addMethod(method));
    }


    get writable(): boolean {
        return this._bIsWritable;
    }


    get readable(): boolean {
        return this._bIsReadable;
    }


    get name(): string {
        return this._name;
    }


    get size(): number {
        if (this.isArray()) {
            if (this.length === instruction.UNDEFINE_LENGTH) {
                return instruction.UNDEFINE_LENGTH;
            }
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


    toDeclString(): string {
        console.warn('@pure_virtual');
        return '';
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


    isContainPointer(): boolean {
        return false;
    }


    toString(): string {
        return this.name || types.hash(this);
    }


    toCode(): string {
        return this._name;
    }


    hasFieldWithSematics(semantic: string): boolean {
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


    getMethod(methodName: string, args?: ITypeInstruction[]): IFunctionDeclInstruction | undefined | null {
        const list = this._methods.filter(method => method.name === methodName);
        return fn.matchList(list, args);
    }


    getFieldBySemantics(semantic: string): IVariableDeclInstruction {
        console.error("@undefined_behavior");
        return null;
    }


    /** internal api */
    addField(field: IVariableDeclInstruction): void {
        console.assert(this.getField(field.name) === null);
        this._fields.push(Instruction.$withParent(field, this));
    }

    /** internal api */
    addMethod(method: IFunctionDeclInstruction): void {
        console.assert(isNull(this.getMethod(method.name, method.def.params.map(param => param.type))));
        this._methods.push(Instruction.$withParent(method, this));
    }
}

