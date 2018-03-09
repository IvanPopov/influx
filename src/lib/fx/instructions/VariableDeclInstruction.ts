import { DeclInstruction } from './DeclInstruction';
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction } from "./../../idl/IInstruction";
import * as Effect from '../Effect';
import { IExprInstruction, IInstruction, EInstructionTypes,
    IInitExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction,
    IIdInstruction } from '../../idl/IInstruction';
import { IdExprInstruction } from './IdExprInstruction';
import { IdInstruction } from './IdInstruction';
import { isNull } from '../../common';
import { IMap } from '../../idl/IMap';
import { StringDictionary } from '../../stringUtils/StringDictionary'
import { VariableTypeInstruction } from './VariableTypeInstruction';
import { IParseNode } from '../../idl/parser/IParser';

export interface IVariableDeclInstructionSettings extends IDeclInstructionSettings {
    id: IIdInstruction;
    type: IVariableTypeInstruction;
    init?: IInitExprInstruction;
}

/**
 * Represent type var_name [= init_expr]
 * EMPTY_OPERATOR VariableTypeInstruction IdInstruction InitExprInstruction
 */
export class VariableDeclInstruction extends DeclInstruction implements IVariableDeclInstruction {

    protected _id: IIdInstruction;
    protected _type: IVariableTypeInstruction;
    protected _initExpr: IInitExprInstruction;

    protected _bForVertex: boolean;
    protected _bForPixel: boolean;

    private _nameIndex: number;

    static SHADER_VAR_NAMES_GLOBAL_DICT: StringDictionary = new StringDictionary();

    constructor({ id, type, init = null, ...settings }: IVariableDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableDeclInstruction, ...settings });

        this._id = id.$withParent(this);
        this._type = type.$withParent(this);
        this._initExpr = init.$withParent(this);

        this._bForVertex = true;
        this._bForPixel = true;
        
        this._nameIndex = VariableDeclInstruction.SHADER_VAR_NAMES_GLOBAL_DICT.add(this.name);
    }

    
    get initExpr(): IInitExprInstruction {
        return this._initExpr;
    }


    get defaultValue(): any {
        this._initExpr.evaluate();
        return this._initExpr.getEvalValue();
    }


    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>this._type;
    }


    get name(): string {
        return this._id.name;
    }

    
    get id(): IIdInstruction {
        return this._id;
    }


    get nameIndex(): number {
        return this._nameIndex;
    }


    get fullName(): string {
        if (this.isField() &&
            VariableTypeInstruction.findParentVariableDecl(<IVariableTypeInstruction>this.parent).visible) {

            var sName: string = '';
            var eParentType: EInstructionTypes = this.parent.instructionType;

            if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
                sName = VariableTypeInstruction.resolveVariableDeclFullName(<IVariableTypeInstruction>this.parent);
            }

            sName += '.' + this.name;

            return sName;
        }
        else {
            return this.name;
        }
    }


    isUniform(): boolean {
        return this.type.hasUsage('uniform');
    }


    isVarying(): boolean {
        console.log('probably will not work');
        return this.type.hasUsage('varying');
    }
    

    isField(): boolean {
        if (isNull(this.parent)) {
            return false;
        }

        var eParentType: EInstructionTypes = this.parent.instructionType;
        if (eParentType === EInstructionTypes.k_VariableTypeInstruction ||
            eParentType === EInstructionTypes.k_ComplexTypeInstruction ||
            eParentType === EInstructionTypes.k_SystemTypeInstruction) {
            return true;
        }

        return false;
    }

    
    isSampler(): boolean {
        return this.type.isSampler();
    }


    toCode(): string {
        var code: string = '';

        {
            code = this.type.toCode();
            code += ' ' + this.id.toCode();

            if (this.type.isNotBaseArray()) {
                var iLength: number = this.type.length;
                code += '[' + iLength + ']';
            }

            if (!isNull(this.initExpr) &&
                !this.isSampler() &&
                !this.isUniform()) {
                code += '=' + this.initExpr.toCode();
            }
        }

        return code;
    }

    $makeVertexCompatible(val: boolean): void {
        this._bForVertex = val;
    }

    $makePixelCompatible(val: boolean): void {
        this._bForPixel = val;
    }

}

