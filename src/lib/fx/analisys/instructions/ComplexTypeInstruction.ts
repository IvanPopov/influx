import { assert, isDef, isDefAndNotNull, isNull } from "@lib/common";
import { EInstructionTypes, IFunctionDeclInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

import { instruction, types } from "../helpers";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IComplexTypeInstructionSettings extends IInstructionSettings {
    name?: string;
    fields: IVariableDeclInstruction[]; // << todo: replace this Array<Instruction>;
    aligment?: number;
}

// todo: merge with system tpye ?
export class ComplexTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _fields: IMap<IVariableDeclInstruction>;
    protected _aligment: number;

    constructor({ name = null, fields, aligment = 1 /* byte */, ...settings }: IComplexTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ComplexType, ...settings });

        this._name = name;
        this._fields = {};
        this._aligment = aligment;

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
        return this.calculatePaddings(false);
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

    
    get fields(): IVariableDeclInstruction[] {
        return Object.values(this._fields);
    }


    get methods(): IFunctionDeclInstruction[] {
        return [];
    }


    toString(): string {
        return this.name || types.hash(this);
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

    
    toCode(): string {
        return this._name;
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


    private addField(variable: IVariableDeclInstruction): void {
        this._fields[variable.name] = variable;
    }

    private addFields(fields: IVariableDeclInstruction[]): void {
        for (var i = 0; i < fields.length; i++) {
            this.addField(fields[i]);
        }

        this.calculatePaddings();
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


    private calculatePaddings(override = true): number {
        const aligment = this._aligment;
        let padding = 0;

        let aligned = (offset, align) => (offset + (align - 1)) & ~(align - 1);

        for (let i = 0; i < this.fields.length; i++) {
            const varType = this.fields[i].type;
            const varSize = varType.size;

            if (varSize === instruction.UNDEFINE_SIZE) {
                assert(false, 'cannot calc padding');
                return instruction.UNDEFINE_SIZE;
            }

            let a = aligned(padding, aligment);
            let b = aligned(padding + varSize, aligment);
            if (b > a) {
                padding = a;   
            }
            if (override)
                varType.$overwritePadding(padding, aligment);
            padding += varSize;   
        }

        return aligned(padding, aligment);
    }
}
