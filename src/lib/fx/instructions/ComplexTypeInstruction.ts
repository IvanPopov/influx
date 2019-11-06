
import { isDef, isDefAndNotNull } from "../../common";
import { EAnalyzerErrors } from '../../idl/EAnalyzerErrors';
import { EInstructionTypes, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import * as SystemScope from "../SystemScope";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IComplexTypeInstructionSettings extends IInstructionSettings {
    name?: string;
    fields: IVariableDeclInstruction[]; // << todo: replace this Array<Instruction>;
}

export class ComplexTypeInstruction extends Instruction implements ITypeInstruction {
    protected _name: string;
    protected _fields: IMap<IVariableDeclInstruction>;

    // helpers
    protected _isContainArray: boolean;
    protected _isContainSampler: boolean;
    protected _isContainComplexType: boolean;

    constructor({ name = null, fields, ...settings }: IComplexTypeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ComplexTypeInstruction, ...settings });

        this._name = name;
        this._fields = {};

        this._isContainArray = false;
        this._isContainSampler = false;
        this._isContainComplexType = false;

        this.addFields(fields.map(field => Instruction.$withParent(field, this)));
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


    get hash(): string {
        return this.calcHash();
    }

    
    get strongHash(): string {
        return this.calcStrongHash();
    }

    
    get size(): number {
        return this.calcSize();
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

    
    toString(): string {
        return this.name || this.hash;
    }

    
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

    
    isEqual(type: ITypeInstruction): boolean {
        return this.hash === type.hash;
    }

    
    isStrongEqual(type: ITypeInstruction): boolean {
        return this.strongHash === type.strongHash;
    }

    
    isConst(): boolean {
        return false;
    }

    
    isSampler(): boolean {
        return false;
    }

    
    isSamplerCube(): boolean {
        return false;
    }

    
    isSampler2D(): boolean {
        return false;
    }

    
    isContainArray(): boolean {
        return this._isContainArray;
    }

    
    isContainSampler(): boolean {
        return this._isContainSampler;
    }

    
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
        let size: number = 0;

        for (let i: number = 0; i < this.fields.length; i++) {
            let iFieldSize: number = this.fields[i].type.size;

            if (iFieldSize === Instruction.UNDEFINE_SIZE) {
                size = Instruction.UNDEFINE_SIZE;
                break;
            }
            else {
                size += iFieldSize;
            }
        }

        return size;
    }


    private calcHash(): string {
        let hash = "{";
        for (let i = 0; i < this.fields.length; i++) {
            hash += this.fields[i].type.hash + ";";
        }
        hash += "}";
        return hash;
    }


    private calcStrongHash(): string {
        let hash = "{";
        for (let i = 0; i < this.fields.length; i++) {
            hash += this.fields[i].type.strongHash + ";";
        }
        hash += "}";
        return hash;
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
        let padding: number = 0;

        for (let i: number = 0; i < this.fields.length; i++) {
            let varType: IVariableTypeInstruction = this.fields[i].type;
            let varSize: number = varType.size;

            if (varSize === Instruction.UNDEFINE_SIZE) {
                this._setError(EAnalyzerErrors.CannotCalcPadding, { typeName: this.name });
                return;
            }

            varType.$overwritePadding(padding);
            padding += varSize;
        }
    }
}
