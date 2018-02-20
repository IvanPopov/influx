import { DeclInstruction } from './DeclInstruction';
import { Effect } from '../Effect';
import { ExtractExprInstruction } from './ExtractExprInstruction';
import { IAFXExprInstruction, IAFXInstruction, EAFXInstructionTypes,
    IAFXInitExprInstruction, IAFXVariableDeclInstruction, IAFXVariableTypeInstruction,
    IAFXIdInstruction, EAFXBlendMode } from '../../idl/IAFXInstruction';
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

    _hasInitializer(): boolean {
        return this._nInstructions === 3 && !isNull(this._getInitializeExpr());
    }

    _getInitializeExpr(): IAFXInitExprInstruction {
        return <IAFXInitExprInstruction>this._getInstructions()[2];
    }

    _hasConstantInitializer(): boolean {
        return this._hasInitializer() && this._getInitializeExpr()._isConst();
    }

    _lockInitializer(): void {
        this._bLockInitializer = true;
    }

    _unlockInitializer(): void {
        this._bLockInitializer = false;
    }

    _getDefaultValue(): any {
        return this._pDefaultValue;
    }

    _prepareDefaultValue(): void {
        this._getInitializeExpr()._evaluate();
        this._pDefaultValue = this._getInitializeExpr()._getEvalValue();
    }

    _getValue(): any {
        return this._pValue;
    }

    _setValue(pValue: any): any {
        this._pValue = pValue;
    }

    _getType(): IAFXVariableTypeInstruction {
        return <IAFXVariableTypeInstruction>this._pInstructionList[0];
    }

    _setType(pType: IAFXVariableTypeInstruction): void {
        this._pInstructionList[0] = <IAFXVariableTypeInstruction>pType;
        pType._setParent(this);

        if (this._nInstructions === 0) {
            this._nInstructions = 1;
        }
    }

    _setName(sName: string): void {
        var pName: IAFXIdInstruction = new IdInstruction();
        pName._setName(sName);
        pName._setParent(this);

        this._pInstructionList[1] = <IAFXIdInstruction>pName;

        if (this._nInstructions < 2) {
            this._nInstructions = 2;
        }
    }

    _setRealName(sRealName: string): void {
        this._getNameId()._setRealName(sRealName);
    }

    _getName(): string {
        return (<IAFXIdInstruction>this._pInstructionList[1])._getName();
    }

    _getRealName(): string {
        return (<IAFXIdInstruction>this._pInstructionList[1])._getRealName();
    }

    _getNameId(): IAFXIdInstruction {
        return <IAFXIdInstruction>this._pInstructionList[1];
    }

    _isUniform(): boolean {
        return this._getType()._hasUsage('uniform');
    }

    _isField(): boolean {
        if (isNull(this._getParent())) {
            return false;
        }

        var eParentType: EAFXInstructionTypes = this._getParent()._getInstructionType();
        if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction ||
            eParentType === EAFXInstructionTypes.k_ComplexTypeInstruction ||
            eParentType === EAFXInstructionTypes.k_SystemTypeInstruction) {
            return true;
        }

        return false;
    }

    _isPointer(): boolean {
        return this._getType()._isPointer();
    }

    _isSampler(): boolean {
        return this._getType()._isSampler();
    }

    _getSubVarDecls(): IAFXVariableDeclInstruction[] {
        return this._getType()._getSubVarDecls();
    }

    _isDefinedByZero(): boolean {
        return this._bDefineByZero;
    }

    _defineByZero(isDefine: boolean): void {
        this._bDefineByZero = isDefine;
    }

    _toFinalCode(): string {
        if (this._isShaderOutput()) {
            return '';
        }
        var sCode: string = '';

        {
            sCode = this._getType()._toFinalCode();
            sCode += ' ' + this._getNameId()._toFinalCode();

            if (this._getType()._isNotBaseArray()) {
                var iLength: number = this._getType()._getLength();
                sCode += '[' + iLength + ']';
            }

            if (this._hasInitializer() &&
                !this._isSampler() &&
                !this._isUniform() &&
                !this._bLockInitializer) {
                sCode += '=' + this._getInitializeExpr()._toFinalCode();
            }
        }

        return sCode;
    }

    _markAsVarying(bValue: boolean): void {
        this._getNameId()._markAsVarying(bValue);
    }

    _markAsShaderOutput(isShaderOutput: boolean): void {
        this._bShaderOutput = isShaderOutput;
    }

    _isShaderOutput(): boolean {
        return this._bShaderOutput;
    }

    _setAttrExtractionBlock(pCodeBlock: IAFXInstruction): void {
        this._pAttrExtractionBlock = pCodeBlock;
    }

    _getAttrExtractionBlock(): IAFXInstruction {
        return this._pAttrExtractionBlock;
    }

    _getNameIndex(): number {
        return this._iNameIndex || (this._iNameIndex = VariableDeclInstruction.pShaderVarNamesGlobalDictionary.add(this._getRealName()));
    }

    _getFullNameExpr(): IAFXExprInstruction {
        if (!isNull(this._pFullNameExpr)) {
            return this._pFullNameExpr;
        }

        if (!this._isField() ||
            !(<IAFXVariableTypeInstruction>this._getParent())._getParentVarDecl()._isVisible()) {
            this._pFullNameExpr = new IdExprInstruction();
            this._pFullNameExpr._push(this._getNameId(), false);
        }
        else {
            var pMainVar: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>this._getType()._getParentContainer();

            if (isNull(pMainVar)) {
                return null;
            }

            var pMainExpr: IAFXExprInstruction = pMainVar._getFullNameExpr();
            if (isNull(pMainExpr)) {
                return null;
            }
            var pFieldExpr: IAFXExprInstruction = new IdExprInstruction();
            pFieldExpr._push(this._getNameId(), false);

            this._pFullNameExpr = new PostfixPointInstruction();
            this._pFullNameExpr._push(pMainExpr, false);
            this._pFullNameExpr._push(pFieldExpr, false);
            this._pFullNameExpr._setType(this._getType());
        }

        return this._pFullNameExpr;
    }

    _getFullName(): string {
        if (this._isField() &&
            (<IAFXVariableTypeInstruction>this._getParent())._getParentVarDecl()._isVisible()) {

            var sName: string = '';
            var eParentType: EAFXInstructionTypes = this._getParent()._getInstructionType();

            if (eParentType === EAFXInstructionTypes.k_VariableTypeInstruction) {
                sName = (<IAFXVariableTypeInstruction>this._getParent())._getFullName();
            }

            sName += '.' + this._getName();

            return sName;
        }
        else {
            return this._getName();
        }
    }

    _setCollapsed(bValue: boolean): void {
        this._getType()._setCollapsed(bValue);
    }

    _isCollapsed(): boolean {
        return this._getType()._isCollapsed();
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableDeclInstruction {
        return <IAFXVariableDeclInstruction>super._clone(pRelationMap);
    }
}

