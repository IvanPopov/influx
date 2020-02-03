import { isDef, isDefAndNotNull, isNull, assert } from "@lib/common";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EAnalyzerErrors } from '@lib/idl/EAnalyzerErrors';
import { EInstructionTypes, IFunctionDeclInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

import { instruction, type } from "../helpers";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IComplexTypeInstructionSettings extends IInstructionSettings {
    name?: string;
    fields: IVariableDeclInstruction[]; // << todo: replace this Array<Instruction>;
    aligment?: number;
}

export class ComplexTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _fields: IMap<IVariableDeclInstruction>;

    // helpers
    protected _isContainArray: boolean;
    protected _isContainSampler: boolean;
    protected _isContainComplexType: boolean;

    protected _aligment: number;

    constructor({ name = null, fields, aligment = 1 /* byte */, ...settings }: IComplexTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ComplexType, ...settings });

        this._name = name;
        this._fields = {};
        this._aligment = aligment;

        this._isContainArray = false;
        this._isContainSampler = false;
        this._isContainComplexType = false;

        this.addFields(fields.filter(field => !isNull(field)).map(field => Instruction.$withParent(field, this)));
    }

    
    get writable(): boolean {
        return true;
    }

    
    get readable(): boolean {
        return true;
    }

    
    get name(): string {
        return this._name;
    }

    
    get size(): number {
        return this.calcSize();
    }


    get aligment(): number {
        return this._aligment;
    }


    get baseType(): ITypeInstruction {
        return this;
    }

    
    get arrayElementType(): ITypeInstruction {
        return null;
    }

    
    get typeDecl(): ITypeDeclInstruction {
        return <ITypeDeclInstruction>this.parent;
    }

    
    get length(): number {
        return 0;
    }

    
    get fieldNames(): string[] {
        return Object.keys(this._fields);
    }

    
    get fields(): IVariableDeclInstruction[] {
        return this.fieldNames.map( name => this._fields[name] );
    }


    get methods(): IFunctionDeclInstruction[] {
        return [];
    }


    isSampler(): boolean {
        return false;
    }

    isTexture(): boolean {
        return false;
    }

    isUAV(): boolean {
        return false;
    }

    
    toString(): string {
        return this.name || type.hash(this);
    }

    /** @deprecated */
    toDeclString(): string {
        var code: string = "struct " + this._name + "{";

        for (var i: number = 0; i < this.fields.length; i++) {
            code += "\t" + this.fields[i].toCode() + ";\n";
        }

        code += "}";

        return code;
    }


    /** @deprecated */
    isEqual(value: ITypeInstruction): boolean {
        return type.equals(this, value);
    }

    
    toCode(): string {
        return this._name;
    }

    
    isBase(): boolean {
        return false;
    }

    
    isArray(): boolean {
        return false;
    }

    
    isNotBaseArray(): boolean {
        return false;
    }

    
    isComplex(): boolean {
        return true;
    }

    
    isConst(): boolean {
        return false;
    }

    
    /** @deprecated */
    isContainArray(): boolean {
        return this._isContainArray;
    }

    
    /** @deprecated */
    isContainSampler(): boolean {
        return this._isContainSampler;
    }

    /** @deprecated */
    isContainComplexType(): boolean {
        return this._isContainComplexType;
    }


    private addField(variable: IVariableDeclInstruction): void {
        var varName: string = variable.name;
        this._fields[varName] = variable;

        var type: IVariableTypeInstruction = variable.type;

        if (type.isNotBaseArray() || type.isContainArray()) {
            this._isContainArray = true;
        }

        if (SystemScope.isSamplerType(type) || type.isContainSampler()) {
            this._isContainSampler = true;
        }

        if (type.isComplex()) {
            this._isContainComplexType = true;
        }
    }

    private addFields(fields: IVariableDeclInstruction[]): void {
        for (var i = 0; i < fields.length; i++) {
            this.addField(fields[i]);
        }

        this.calculatePaddings();
    }


    hasField(fieldName: string): boolean {
        return isDef(this._fields[fieldName]);
    }


    hasFieldWithSematics(semantic: string): boolean {
        return !!this.getFieldBySemantics(semantic);
    }


    getField(fieldName: string): IVariableDeclInstruction {
        return this._fields[fieldName] || null;
    }


    getMethod(methodName: string, args?: ITypeInstruction[]): IFunctionDeclInstruction {
        return null;
    }


    getFieldBySemantics(semantic: string): IVariableDeclInstruction {
        for (let i in this._fields) {
            let field = this._fields[i];
            if (semantic == field.semantic) {
                return field;
            }
        }
        return null;
    }

    
    public calcSize(): number {
        let aligment = this._aligment;
        let size = 0;

        for (let i = 0; i < this.fields.length; i++) {
            const fieldSize = this.fields[i].type.size;
            if (fieldSize === instruction.UNDEFINE_SIZE) {
                size = instruction.UNDEFINE_SIZE;
                break;
            }
            // size += type.alignSize(fieldSize, aligment);   
            assert(fieldSize === type.alignSize(fieldSize, aligment));
            size += fieldSize;
        }

        return size;
    }



    hasFieldWithoutSemantics(): boolean {
        for (let i in this._fields) {
            let field = this._fields[i];
            let semantic = field.semantic;
            if (semantic == null || semantic == '') {
                return true;
            }
            if (field.type.hasFieldWithoutSemantics()) {
                return true;
            }
        }

        return false;
    }


    hasAllUniqueSemantics(): boolean {
        let fieldBySemantics: IMap<IVariableDeclInstruction> = {};

        for (let i in this._fields) {
            let field = this._fields[i];
            let semantic = field.semantic;
            
            if (isDefAndNotNull(fieldBySemantics[semantic])) {
                return false;
            }

            fieldBySemantics[semantic] = field;

            if (field.type.isComplex() && !field.type.hasAllUniqueSemantics()) {
                return false;
            }
        }

        return true;
    }


    private calculatePaddings(): void {
        const aligment = this._aligment;
        let padding = 0;

        for (let i = 0; i < this.fields.length; i++) {
            const varType = this.fields[i].type;
            const varSize = varType.size;

            if (varSize === instruction.UNDEFINE_SIZE) {
                // this._setError(EAnalyzerErrors.CannotCalcPadding, { typeName: this.name });
                // TODO: emit error!
                assert(false, 'cannot calc padding');
                return;
            }

            varType.$overwritePadding(padding, aligment);
            padding += type.alignSize(varSize, aligment);
        }
    }
}
