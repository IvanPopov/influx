
import { isDefAndNotNull } from "./../../common";
import { IInstructionCollector } from "./../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { ITypeInstruction, IVariableDeclInstruction, EInstructionTypes, IInstruction, IVariableTypeInstruction, ITypeDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull, isDef } from "../../common";
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class ComplexTypeInstruction extends Instruction implements ITypeInstruction {
    private _name: string;
    private _realName: string;
    private _fields: IMap<IVariableDeclInstruction>;

    private _isContainArray: boolean;
    private _isContainSampler: boolean;
    private _isContainComplexType: boolean;

    constructor(node: IParseNode, name: string, realName: string, fields: IVariableDeclInstruction[]) {
        super(node, EInstructionTypes.k_ComplexTypeInstruction);

        this._name = null;
        this._realName = null;
        this._fields = {};

        this._isContainArray = false;
        this._isContainSampler = false;
        this._isContainComplexType = false;

        fields.forEach( field => this.addField(field) );
    }

    get builtIn(): boolean {
        return false;
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


    get realName(): string {
        return this._realName;
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
        var code: string = "struct " + this._realName + "{";

        for (var i: number = 0; i < this.fields.length; i++) {
            code += "\t" + this.fields[i].toCode() + ";\n";
        }

        code += "}";

        return code;
    }

    
    toCode(): string {
        return this._realName;
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
        var sVarName: string = variable.name;
        this._fields[sVarName] = variable;

        var type: IVariableTypeInstruction = variable.type;

        if (type.isNotBaseArray() || type.isContainArray()) {
            this._isContainArray = true;
        }

        if (Effect.isSamplerType(type) || type.isContainSampler()) {
            this._isContainSampler = true;
        }

        if (type.isComplex()) {
            this._isContainComplexType = true;
        }
    }

    private addFields(pFieldCollector: IInstructionCollector, isSetParent: boolean = true): void {
        let fields = <IVariableDeclInstruction[]>(pFieldCollector.instructions);

        for (var i: number = 0; i < this.fields.length; i++) {
            this.addField(fields[i]);
            fields[i].parent = this;
        }

        this.calculatePaddings();
    }


    hasField(fieldName: string): boolean {
        return isDef(this._fields[fieldName]);
    }


    hasFieldWithSematics(semantics: string): boolean {
        return !!this.getFieldBySemantics(semantics);
    }


    getField(fieldName: string): IVariableDeclInstruction {
        return this._fields[fieldName] || null;
    }


    getFieldBySemantics(semantics: string): IVariableDeclInstruction {
        for (let i in this._fields) {
            let field = this._fields[i];
            if (semantics == field.semantics) {
                return field;
            }
        }
        return null;
    }


    getFieldType(fieldName: string): IVariableTypeInstruction {
        return isDef(this._fields[fieldName]) ? this._fields[fieldName].type : null;
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
        let sHash: string = "{";
        for (let i: number = 0; i < this.fields.length; i++) {
            sHash += this.fields[i].type.hash + ";";
        }
        sHash += "}";
        return sHash;
    }


    private calcStrongHash(): string {
        let sStrongHash: string = "{";
        for (let i: number = 0; i < this.fields.length; i++) {
            sStrongHash += this.fields[i].type.strongHash + ";";
        }
        sStrongHash += "}";
        return sStrongHash;
    }


    hasFieldWithoutSemantics(): boolean {
        for (let i in this._fields) {
            let field = this._fields[i];
            let semantics = field.semantics;
            if (semantics == null || semantics == '') {
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
            let semantics = field.semantics;
            
            if (isDefAndNotNull(fieldBySemantics[semantics])) {
                return false;
            }

            fieldBySemantics[semantics] = field;

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
                this._setError(EEffectErrors.CANNOT_CALCULATE_PADDINGS, { typeName: this.name });
                return;
            }

            varType.padding = padding;
            padding += varSize;
        }
    }
}
