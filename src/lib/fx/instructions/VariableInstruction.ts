import { DeclInstruction } from './DeclInstruction';
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

export class VariableDeclInstruction extends DeclInstruction implements IVariableDeclInstruction {
    private _pFullNameExpr: IExprInstruction;
    private _bShaderOutput: boolean;
    private _pAttrExtractionBlock: IInstruction;
    private _pValue: any;
    private _pDefaultValue: any;
    private _bLockInitializer: boolean;
    private _iNameIndex: number;

    static SHADER_VAR_NAMES_GLOBAL_DICT: StringDictionary = new StringDictionary();
    static _getIndex(sName: string): number {
        return VariableDeclInstruction.SHADER_VAR_NAMES_GLOBAL_DICT.index(sName);
    }
    /**
     * Represent type var_name [= init_expr]
     * EMPTY_OPERATOR VariableTypeInstruction IdInstruction InitExprInstruction
     */
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_VariableDeclInstruction);

        this._pFullNameExpr = null;
        this._bShaderOutput = false;
        this._pAttrExtractionBlock = null;
        this._pValue = null;
        this._pDefaultValue = null;
        this._bLockInitializer = false;
        this._iNameIndex = 0;
    }

    get initializeExpr(): IInitExprInstruction {
        return <IInitExprInstruction>this.instructions[2];
    }

    get defaultValue(): any {
        return this._pDefaultValue;
    }

    get value(): any {
        return this._pValue;
    }

    set value(pValue: any) {
        this._pValue = pValue;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>this.instructions[0];
    }

    set type(pType: IVariableTypeInstruction) {
        this.instructions[0] = <IVariableTypeInstruction>pType;
        pType.parent = (this);
    }

    set name(sName: string) {
        var pName: IIdInstruction = new IdInstruction(null);
        pName.name = (sName);
        pName.parent = (this);

        this.instructions[1] = <IIdInstruction>pName;
    }

    set realName(sRealName: string) {
        this.nameID.realName = (sRealName);
    }

    get name(): string {
        return (<IIdInstruction>this.instructions[1]).name;
    }

    get realName(): string {
        return (<IIdInstruction>this.instructions[1]).realName;
    }

    get nameID(): IIdInstruction {
        return <IIdInstruction>this.instructions[1];
    }

    get vars(): IVariableDeclInstruction[] {
        return this.type.vars;
    }

    set collapsed(bValue: boolean) {
        this.type.collapsed = (bValue);
    }

    get collapsed(): boolean {
        return this.type.collapsed;
    }

    set varying(bValue: boolean) {
        this.nameID.varying = bValue;
    }

    get varying(): boolean {
        return this.nameID.varying;
    }

    set shaderOutput(isShaderOutput: boolean) {
        this._bShaderOutput = isShaderOutput;
    }

    get shaderOutput(): boolean {
        return this._bShaderOutput;
    }

    set attrExtractionBlock(pCodeBlock: IInstruction) {
        this._pAttrExtractionBlock = pCodeBlock;
    }

    get attrExtractionBlock(): IInstruction {
        return this._pAttrExtractionBlock;
    }

    get nameIndex(): number {
        return this._iNameIndex || (this._iNameIndex = VariableDeclInstruction.SHADER_VAR_NAMES_GLOBAL_DICT.add(this.realName));
    }

    get fullNameExpr(): IExprInstruction {
        if (!isNull(this._pFullNameExpr)) {
            return this._pFullNameExpr;
        }

        this._pFullNameExpr = new IdExprInstruction(null);
        this._pFullNameExpr.push(this.nameID, false);

        return this._pFullNameExpr;
    }

    get fullName(): string {
        if (this.isField() &&
            (<IVariableTypeInstruction>this.parent).parentVarDecl.visible) {

            var sName: string = '';
            var eParentType: EInstructionTypes = this.parent.instructionType;

            if (eParentType === EInstructionTypes.k_VariableTypeInstruction) {
                sName = (<IVariableTypeInstruction>this.parent).fullName;
            }

            sName += '.' + this.name;

            return sName;
        }
        else {
            return this.name;
        }
    }


    fillNameIndex(): void {
        this._iNameIndex = VariableDeclInstruction.SHADER_VAR_NAMES_GLOBAL_DICT.add(this.realName);
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

    lockInitializer(): void {
        this._bLockInitializer = true;
    }

    unlockInitializer(): void {
        this._bLockInitializer = false;
    }

    prepareDefaultValue(): void {
        this.initializeExpr.evaluate();
        this._pDefaultValue = this.initializeExpr.getEvalValue();
    }

    toCode(): string {
        if (this.shaderOutput) {
            return '';
        }
        var sCode: string = '';

        {
            sCode = this.type.toCode();
            sCode += ' ' + this.nameID.toCode();

            if (this.type.isNotBaseArray()) {
                var iLength: number = this.type.length;
                sCode += '[' + iLength + ']';
            }

            if (!isNull(this.initializeExpr) &&
                !this.isSampler() &&
                !this.isUniform() &&
                !this._bLockInitializer) {
                sCode += '=' + this.initializeExpr.toCode();
            }
        }

        return sCode;
    }
}

