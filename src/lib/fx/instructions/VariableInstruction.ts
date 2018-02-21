import { DeclInstruction } from './DeclInstruction';
import * as Effect from '../Effect';
import { IAFXExprInstruction, IAFXInstruction, EAFXInstructionTypes,
    IAFXInitExprInstruction, IAFXVariableDeclInstruction, IAFXVariableTypeInstruction,
    IAFXIdInstruction } from '../../idl/IAFXInstruction';
import { IdExprInstruction } from './IdExprInstruction';
import { IdInstruction } from './IdInstruction';
import { isNull } from '../../common';
import { IMap } from '../../idl/IMap';
import { StringDictionary } from '../../stringUtils/StringDictionary'
import { PostfixPointInstruction } from './PostfixPointInstruction';
import { VariableTypeInstruction } from './VariableTypeInstruction';
import { IParseNode } from '../../idl/parser/IParser';

export class VariableDeclInstruction extends DeclInstruction implements IAFXVariableDeclInstruction {
    private _pFullNameExpr: IAFXExprInstruction = null;
    private _bDefineByZero: boolean = false;
    private _bShaderOutput: boolean = false;

    private _pAttrExtractionBlock: IAFXInstruction = null;

    private _pValue: any = null;
    private _pDefaultValue: any = null;

    private _bLockInitializer: boolean = false;

    private _iNameIndex: number = 0;

    static pShaderVarNamesGlobalDictionary: StringDictionary = new StringDictionary();
    static _getIndex(sName: string): number {
        return VariableDeclInstruction.pShaderVarNamesGlobalDictionary.add(sName);
    }
    /**
     * Represent type var_name [= init_expr]
     * EMPTY_OPERATOR VariableTypeInstruction IdInstruction InitExprInstruction
     */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pSourceNode = pNode;
        this._pInstructionList = [null, null, null];
        this._eInstructionType = EAFXInstructionTypes.k_VariableDeclInstruction;
    }

    get initializeExpr(): IAFXInitExprInstruction {
        return <IAFXInitExprInstruction>this.instructions[2];
    }

    lockInitializer(): void {
        this._bLockInitializer = true;
    }

    unlockInitializer(): void {
        this._bLockInitializer = false;
    }

    get defaultValue(): any {
        return this._pDefaultValue;
    }

    prepareDefaultValue(): void {
        this.initializeExpr.evaluate();
        this._pDefaultValue = this.initializeExpr.getEvalValue();
    }

    get value(): any {
        return this._pValue;
    }

    set value(pValue: any) {
        this._pValue = pValue;
    }

    get type(): IAFXVariableTypeInstruction {
        return <IAFXVariableTypeInstruction>this._pInstructionList[0];
    }

    set type(pType: IAFXVariableTypeInstruction) {
        this._pInstructionList[0] = <IAFXVariableTypeInstruction>pType;
        pType.parent = (this);
    }

    set name(sName: string) {
        var pName: IAFXIdInstruction = new IdInstruction(null);
        pName.name = (sName);
        pName.parent = (this);

        this._pInstructionList[1] = <IAFXIdInstruction>pName;
    }

    set realName(sRealName: string) {
        this.nameID.realName = (sRealName);
    }

    get name(): string {
        return (<IAFXIdInstruction>this._pInstructionList[1]).name;
    }

    get realName(): string {
        return (<IAFXIdInstruction>this._pInstructionList[1]).realName;
    }

    get nameID(): IAFXIdInstruction {
        return <IAFXIdInstruction>this._pInstructionList[1];
    }

    isUniform(): boolean {
        return this.type.hasUsage('uniform');
    }

    isField(): boolean {
        if (isNull(this.parent)) {
            return false;
        }

        var eParentType: EAFXInstructionTypes = this.parent.instructionType;
        if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction ||
            eParentType === EAFXInstructionTypes.k_ComplexTypeInstruction ||
            eParentType === EAFXInstructionTypes.k_SystemTypeInstruction) {
            return true;
        }

        return false;
    }

    isSampler(): boolean {
        return this.type.isSampler();
    }

    get subVarDecls(): IAFXVariableDeclInstruction[] {
        return this.type.subVarDecls;
    }

    isDefinedByZero(): boolean {
        return this._bDefineByZero;
    }

    defineByZero(isDefine: boolean): void {
        this._bDefineByZero = isDefine;
    }

    toCode(): string {
        if (this.isShaderOutput()) {
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

    markAsVarying(bValue: boolean): void {
        this.nameID.markAsVarying(bValue);
    }

    markAsShaderOutput(isShaderOutput: boolean): void {
        this._bShaderOutput = isShaderOutput;
    }

    isShaderOutput(): boolean {
        return this._bShaderOutput;
    }

    set attrExtractionBlock(pCodeBlock: IAFXInstruction) {
        this._pAttrExtractionBlock = pCodeBlock;
    }

    get attrExtractionBlock(): IAFXInstruction {
        return this._pAttrExtractionBlock;
    }

    get nameIndex(): number {
        return this._iNameIndex || (this._iNameIndex = VariableDeclInstruction.pShaderVarNamesGlobalDictionary.add(this.realName));
    }

    get fullNameExpr(): IAFXExprInstruction {
        if (!isNull(this._pFullNameExpr)) {
            return this._pFullNameExpr;
        }

        if (!this.isField() ||
            !(<IAFXVariableTypeInstruction>this.parent).parentVarDecl.visible) {
            this._pFullNameExpr = new IdExprInstruction(null);
            this._pFullNameExpr.push(this.nameID, false);
        }
        else {
            var pMainVar: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>this.type.parentContainer;

            if (isNull(pMainVar)) {
                return null;
            }

            var pMainExpr: IAFXExprInstruction = pMainVar.fullNameExpr;
            if (isNull(pMainExpr)) {
                return null;
            }
            var pFieldExpr: IAFXExprInstruction = new IdExprInstruction(null);
            pFieldExpr.push(this.nameID, false);

            this._pFullNameExpr = new PostfixPointInstruction();
            this._pFullNameExpr.push(pMainExpr, false);
            this._pFullNameExpr.push(pFieldExpr, false);
            this._pFullNameExpr.type = (this.type);
        }

        return this._pFullNameExpr;
    }

    get fullName(): string {
        if (this.isField() &&
            (<IAFXVariableTypeInstruction>this.parent).parentVarDecl.visible) {

            var sName: string = '';
            var eParentType: EAFXInstructionTypes = this.parent.instructionType;

            if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction) {
                sName = (<IAFXVariableTypeInstruction>this.parent).fullName;
            }

            sName += '.' + this.name;

            return sName;
        }
        else {
            return this.name;
        }
    }

    set collapsed(bValue: boolean) {
        this.type.collapsed = (bValue);
    }

    get collapsed(): boolean {
        return this.type.collapsed;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableDeclInstruction {
        return <IAFXVariableDeclInstruction>super.clone(pRelationMap);
    }
}

