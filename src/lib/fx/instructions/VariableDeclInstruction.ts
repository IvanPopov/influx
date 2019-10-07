import { DeclInstruction } from './DeclInstruction';
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction, ITypeUseInfoContainer, EVarUsedMode } from "../../idl/IInstruction";
import * as Analyzer from '../Analyzer';
import {
    IExprInstruction, IInstruction, EInstructionTypes,
    IInitExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction,
    IIdInstruction
} from '../../idl/IInstruction';
import { IdExprInstruction } from './IdExprInstruction';
import { IdInstruction } from './IdInstruction';
import { isNull, isString, assert } from '../../common';
import { IMap } from '../../idl/IMap';
import { VariableTypeInstruction } from './VariableTypeInstruction';
import { IParseNode } from '../../idl/parser/IParser';
import { Instruction } from './Instruction';

export interface IVariableDeclInstructionSettings extends IDeclInstructionSettings {
    id: IIdInstruction;
    type: IVariableTypeInstruction;
    init?: IInitExprInstruction;

    // EVariableUsageFlags
    usageFlags?: number;
}

export enum EVariableUsageFlags {
    k_Local     = 0x01,
    k_Global    = 0x02,
    k_Argument  = 0x04,
}

/**
 * Represent type var_name [= init_expr]
 * EMPTY_OPERATOR VariableTypeInstruction IdInstruction InitExprInstruction
 */
export class VariableDeclInstruction extends DeclInstruction implements IVariableDeclInstruction {

    protected _id: IIdInstruction;
    protected _type: IVariableTypeInstruction;
    protected _initExpr: IInitExprInstruction;
    protected _usageFlags: number;

    /** @deprecated */
    protected _bForVertex: boolean;
    /** @deprecated */
    protected _bForPixel: boolean;

 
    constructor({ id, type, init = null, usageFlags = 0, ...settings }: IVariableDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableDeclInstruction, ...settings });

        this._id = Instruction.$withParent(id, this);
        this._type = Instruction.$withNoParent(type);
        this._initExpr = Instruction.$withParent(init, this);
        this._usageFlags = usageFlags;

        this._bForVertex = true;
        this._bForPixel = true;
    }


    get initExpr(): IInitExprInstruction {
        return this._initExpr;
    }


    /** @deprecated */
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


    get fullName(): string {
        if (this.isField() &&
            VariableTypeInstruction.findParentVariableDecl(<IVariableTypeInstruction>this.parent).visible) {

            var name = '';
            var parentType = this.parent.instructionType;

            if (parentType === EInstructionTypes.k_VariableTypeInstruction) {
                name = VariableTypeInstruction.resolveVariableDeclFullName(<IVariableTypeInstruction>this.parent);
            }

            name += '.' + this.name;
            return name;
        }
        else {
            return this.name;
        }
    }


    isGlobal(): boolean {
        /**
         * Should also be computable from the scopes.
         */
        return !!(this._usageFlags & EVariableUsageFlags.k_Global);
    }


    isLocal(): boolean {
        assert(!this.isGlobal());
        /**
         * Should also be computable from the scopes.
         */
        return !!(this._usageFlags & EVariableUsageFlags.k_Local);
    }


    isParameter(): boolean {
        assert(!this.isGlobal());
        assert(this.isLocal());
        /**
         * Should also be computable from the scopes.
         */
        return !!(this._usageFlags & EVariableUsageFlags.k_Argument);
    }


    /** @deprecated */
    isUniform(): boolean {
        return this.type.hasUsage('uniform');
    }

    /** @deprecated */
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

    /** @deprecated */
    $makeVertexCompatible(val: boolean): void {
        this._bForVertex = val;
    }

    /** @deprecated */
    $makePixelCompatible(val: boolean): void {
        this._bForPixel = val;
    }

    /** @deprecated */
    checkVertexUsage(): boolean {
        return this._bForVertex;
    }

    /** @deprecated */
    checkPixelUsage(): boolean {
        return this._bForPixel;
    }

}

