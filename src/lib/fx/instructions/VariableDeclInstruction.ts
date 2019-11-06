import { DeclInstruction } from './DeclInstruction';
import { IDeclInstructionSettings } from "./DeclInstruction";
import { IAnnotationInstruction, ITypeUseInfoContainer, EVarUsedMode, IFunctionDeclInstruction, IFunctionDefInstruction } from "../../idl/IInstruction";
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

/**
 * @deprecated
 */
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

 
    constructor({ id, type, init = null, usageFlags = 0, ...settings }: IVariableDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_VariableDeclInstruction, ...settings });

        this._id = Instruction.$withParent(id, this);
        this._type = Instruction.$withNoParent(type);
        this._initExpr = Instruction.$withParent(init, this);
        this._usageFlags = usageFlags;

        assert(!this.isParameter() || (isNull(this.parent) || this.parent.instructionType == EInstructionTypes.k_FunctionDefInstruction));
        assert(this.isLocal() || !this.isLocal());
        assert(!this.isParameter() || this.isLocal());
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
            VariableTypeInstruction.findParentVariableDecl(<IVariableTypeInstruction>this.parent)) {

            var name = '';
            var parentType = this.parent.instructionType;

            if (parentType === EInstructionTypes.k_VariableTypeInstruction) {
                name = VariableTypeInstruction.resolveVariableDeclFullName(<IVariableTypeInstruction>this.parent);
            }

            name += '.' + this.name;
            return name;
        }

        return this.name;
    }


    isGlobal(): boolean {
        return !!(this._usageFlags & EVariableUsageFlags.k_Global);
    }


    isLocal(): boolean {
        return !!(this._usageFlags & EVariableUsageFlags.k_Local);
    }

    isParameter(): boolean {
        return !!(this._usageFlags & EVariableUsageFlags.k_Argument);
    }


    isUniform(): boolean {
        return this.type.hasUsage('uniform');
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
        var code = '';        
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
        return code;
    }


    /**
     * @param decl Variable declaraion (decl.isParameter() must be true).
     * @returns Serial number of the declaration among the function parameters or -1 otherwise.
     */
    static getParameterIndex(decl: IVariableDeclInstruction): number {
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return -1;
        }
        // all parameters must be a children on function definition!
        assert(decl.parent.instructionType === EInstructionTypes.k_FunctionDefInstruction);
        return (<IFunctionDefInstruction>decl.parent).params.indexOf(decl);
    }

    /**
     * @returns Offset in bytes from the beginning of the parameters' list.
     */
    static getParameterOffset(decl: IVariableDeclInstruction): number {
        // todo: add support for 'inout', 'out' usages 
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return 0;
        }
        
        let idx = VariableDeclInstruction.getParameterIndex(decl);
        let offset = 0;
        for (let i = 0; i < idx; ++i) {
            offset += (<IFunctionDefInstruction>decl.parent).params[i].type.size;
        }
        return offset;
    }
}

