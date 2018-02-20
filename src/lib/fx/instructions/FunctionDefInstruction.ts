import { DeclInstruction } from "./DeclInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IAFXVariableDeclInstruction, IAFXVariableTypeInstruction, IAFXIdInstruction, EAFXInstructionTypes, IAFXTypeInstruction, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";

/**
 * Represent type func(...args)[:Semantic]
 * EMPTY_OPERTOR VariableTypeInstruction IdInstruction VarDeclInstruction ... VarDeclInstruction
 */
export class FunctionDefInstruction extends DeclInstruction {
    private _pParameterList: IAFXVariableDeclInstruction[] = null;
    private _pParamListForShaderCompile: IAFXVariableDeclInstruction[] = null;
    private _pParamListForShaderInput: IAFXVariableDeclInstruction[] = null;
    private _bIsComplexShaderInput: boolean = false;

    private _pReturnType: IAFXVariableTypeInstruction = null;
    private _pFunctionName: IAFXIdInstruction = null;
    private _nParamsNeeded: number = 0;
    private _sDefinition: string = "";
    private _isAnalyzedForVertexUsage: boolean = false;
    private _isAnalyzedForPixelUsage: boolean = false;
    private _bCanUsedAsFunction: boolean = true;

    private _bShaderDef: boolean = false;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._pParameterList = [];
        this._eInstructionType = EAFXInstructionTypes.k_FunctionDefInstruction;
    }

    _toFinalCode(): string {
        var sCode: string = "";

        if (!this.shaderDef) {

            sCode += this._pReturnType._toFinalCode();
            sCode += " " + this._pFunctionName._toFinalCode();
            sCode += "(";

            for (var i: number = 0; i < this._pParameterList.length; i++) {
                sCode += this._pParameterList[i]._toFinalCode();

                if (i !== this._pParameterList.length - 1) {
                    sCode += ",";
                }
            }

            sCode += ")";
        }
        else {
            sCode = "void " + this._pFunctionName._toFinalCode() + "()";
        }

        return sCode;
    }

    set type(pType: IAFXTypeInstruction) {
        this.returnType = (<IAFXVariableTypeInstruction>pType);
    }

    get type(): IAFXTypeInstruction {
        return <IAFXTypeInstruction>this.returnType;
    }

    set returnType(pReturnType: IAFXVariableTypeInstruction) {
        this._pReturnType = pReturnType;
        pReturnType.parent = (this);
    }

    get returnType(): IAFXVariableTypeInstruction {
        return this._pReturnType;
    }

    set functionName(pNameId: IAFXIdInstruction) {
        this._pFunctionName = pNameId;
        pNameId.parent = (this);
    }

    get name(): string {
        return this._pFunctionName.name;
    }

    get realName(): string {
        return this._pFunctionName.realName;
    }

    get nameId(): IAFXIdInstruction {
        return this._pFunctionName;
    }

    get arguments(): IAFXVariableDeclInstruction[] {
        return this._pParameterList;
    }

    get numNeededArguments(): number {
        return this._nParamsNeeded;
    }

    set shaderDef(isShaderDef: boolean) {
        this._bShaderDef = isShaderDef;
    }

    get shaderDef(): boolean {
        return this._bShaderDef;
    }

    addParameter(pParameter: IAFXVariableDeclInstruction, isStrictModeOn?: boolean): boolean {
        if (this._pParameterList.length > this._nParamsNeeded &&
            !pParameter.initializeExpr) {

            this._setError(EEffectErrors.BAD_FUNCTION_PARAMETER_DEFENITION_NEED_DEFAULT,
                {
                    funcName: this._pFunctionName.name,
                    varName: pParameter.name
                });
            return false;
        }

        var pParameterType: IAFXVariableTypeInstruction = pParameter.type;

        this._pParameterList.push(pParameter);
        pParameter.parent = (this);

        if (!pParameter.initializeExpr) {
            this._nParamsNeeded++;
        }

        return true;
    }

    getParameListForShaderInput(): IAFXVariableDeclInstruction[] {
        return this._pParamListForShaderInput;
    }

    isComplexShaderInput(): boolean {
        return this._bIsComplexShaderInput;
    }

    _clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): FunctionDefInstruction {
        var pClone: FunctionDefInstruction = <FunctionDefInstruction>super._clone(pRelationMap);

        pClone.functionName = (<IAFXIdInstruction>this._pFunctionName._clone(pRelationMap));
        pClone.returnType = (<IAFXVariableTypeInstruction>this.returnType._clone(pRelationMap));

        for (var i: number = 0; i < this._pParameterList.length; i++) {
            pClone.addParameter(this._pParameterList[i]._clone(pRelationMap));
        }

        var pShaderParams: IAFXVariableDeclInstruction[] = [];
        for (var i: number = 0; i < this._pParamListForShaderInput.length; i++) {
            pShaderParams.push(this._pParamListForShaderInput[i]._clone(pRelationMap));
        }

        pClone.setShaderParams(pShaderParams, this._bIsComplexShaderInput);
        pClone.setAnalyzedInfo(this._isAnalyzedForVertexUsage,
            this._isAnalyzedForPixelUsage,
            this._bCanUsedAsFunction);

        return pClone;
    }

    setShaderParams(pParamList: IAFXVariableDeclInstruction[], isComplexInput: boolean): void {
        this._pParamListForShaderInput = pParamList;
        this._bIsComplexShaderInput = isComplexInput;
    }

    setAnalyzedInfo(isAnalyzedForVertexUsage: boolean,
        isAnalyzedForPixelUsage: boolean,
        bCanUsedAsFunction: boolean): void {
        this._isAnalyzedForVertexUsage = isAnalyzedForVertexUsage;
        this._isAnalyzedForPixelUsage = isAnalyzedForPixelUsage;
        this._bCanUsedAsFunction = bCanUsedAsFunction;
    }

    get stringDef(): string {
        if (this._sDefinition === "") {
            this._sDefinition = this._pReturnType.hash + " " + this.name + "(";

            for (var i: number = 0; i < this._pParameterList.length; i++) {
                this._sDefinition += this._pParameterList[i].type.hash + ",";
            }

            this._sDefinition += ")";
        }

        return this._sDefinition;
    }

    canUsedAsFunction(): boolean {
        return this._bCanUsedAsFunction;
    }

    checkForVertexUsage(): boolean {
        if (this._isAnalyzedForVertexUsage) {
            return this.isForVertex();
        }

        this._isAnalyzedForVertexUsage = true;

        var isGood: boolean = true;

        isGood = this.checkReturnTypeForVertexUsage();
        if (!isGood) {
            this.setForVertex(false);
            return false;
        }

        isGood = this.checkArgumentsForVertexUsage();
        if (!isGood) {
            this.setForVertex(false);
            return false;
        }

        this.setForVertex(true);

        return true;
    }

    checkForPixelUsage(): boolean {
        if (this._isAnalyzedForPixelUsage) {
            return this.isForPixel();
        }

        this._isAnalyzedForPixelUsage = true;

        var isGood: boolean = true;

        isGood = this.checkReturnTypeForPixelUsage();
        if (!isGood) {
            this.setForPixel(false);
            return false;
        }

        isGood = this.checkArgumentsForPixelUsage();
        if (!isGood) {
            this.setForPixel(false);
            return false;
        }

        this.setForPixel(true);

        return true;
    }

    private checkReturnTypeForVertexUsage(): boolean {
        var pReturnType: IAFXVariableTypeInstruction = this._pReturnType;
        var isGood: boolean = true;

        if (pReturnType.isEqual(Effect.getSystemType("void"))) {
            return true;
        }

        if (pReturnType.isComplex()) {
            isGood = !pReturnType.hasFieldWithoutSemantic();
            if (!isGood) {
                return false;
            }

            isGood = pReturnType.hasAllUniqueSemantics();
            if (!isGood) {
                return false;
            }

            // isGood = pReturnType._hasFieldWithSematic("POSITION");
            // if(!isGood){
            // 	return false;
            // }

            isGood = !pReturnType.isContainSampler();
            if (!isGood) {
                return false;
            }

            isGood = !pReturnType.isContainComplexType();
            if (!isGood) {
                return false;
            }

            return true;
        }
        else {
            isGood = pReturnType.isEqual(Effect.getSystemType("float4"));
            if (!isGood) {
                return false;
            }

            isGood = (this.semantics === "POSITION");
            if (!isGood) {
                return false;
            }

            return true;
        }
    }

    private checkReturnTypeForPixelUsage(): boolean {
        var pReturnType: IAFXVariableTypeInstruction = this._pReturnType;
        var isGood: boolean = true;

        if (pReturnType.isEqual(Effect.getSystemType("void"))) {
            return true;
        }

        isGood = pReturnType.isBase();
        if (!isGood) {
            return false;
        }

        isGood = pReturnType.isEqual(Effect.getSystemType("float4"));
        if (!isGood) {
            return false;
        }

        isGood = this.semantics === "COLOR";
        if (!isGood) {
            return false;
        }

        return true;
    }


    private checkArgumentsForVertexUsage(): boolean {
        var pArguments: IAFXVariableDeclInstruction[] = this._pParameterList;
        var isAttributeByStruct: boolean = false;
        var isAttributeByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._pParamListForShaderInput = [];
        this._pParamListForShaderCompile = [];

        for (var i: number = 0; i < pArguments.length; i++) {
            var pParam: IAFXVariableDeclInstruction = pArguments[i];

            if (pParam.isUniform()) {
                this._pParamListForShaderCompile.push(pParam);
                continue;
            }

            if (!isStartAnalyze) {
                if (pParam.semantics === "") {
                    if (pParam.type.isBase() ||
                        pParam.type.hasFieldWithoutSemantic() ||
                        !pParam.type.hasAllUniqueSemantics()) {
                        return false;
                    }

                    isAttributeByStruct = true;
                }
                else if (pParam.semantics !== "") {
                    if (pParam.type.isComplex() &&
                        (pParam.type.hasFieldWithoutSemantic() ||
                            !pParam.type.hasAllUniqueSemantics())) {
                        return false;
                    }

                    isAttributeByParams = true;
                }

                isStartAnalyze = true;
            }
            else if (isAttributeByStruct) {
                return false;
            }
            else if (isAttributeByParams) {
                if (pParam.semantics === "") {
                    return false;
                }

                if (pParam.type.isComplex() &&
                    (pParam.type.hasFieldWithoutSemantic() ||
                        !pParam.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._pParamListForShaderInput.push(pParam);
        }

        if (isAttributeByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }

    private checkArgumentsForPixelUsage(): boolean {
        var pArguments: IAFXVariableDeclInstruction[] = this._pParameterList;
        var isVaryingsByStruct: boolean = false;
        var isVaryingsByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._pParamListForShaderInput = [];
        this._pParamListForShaderCompile = [];

        for (var i: number = 0; i < pArguments.length; i++) {
            var pParam: IAFXVariableDeclInstruction = pArguments[i];

            if (pParam.isUniform()) {
                this._pParamListForShaderCompile.push(pParam);
                continue;
            }

            if (!isStartAnalyze) {
                if (pParam.semantics === "") {
                    if (pParam.type.isBase() ||
                        pParam.type.hasFieldWithoutSemantic() ||
                        !pParam.type.hasAllUniqueSemantics() ||
                        pParam.type.isContainSampler()) {
                        return false;
                    }

                    isVaryingsByStruct = true;
                }
                else if (pParam.semantics !== "") {
                    if (pParam.type.isContainSampler() ||
                        Effect.isSamplerType(pParam.type)) {
                        return false;
                    }

                    if (pParam.type.isComplex() &&
                        (pParam.type.hasFieldWithoutSemantic() ||
                            !pParam.type.hasAllUniqueSemantics())) {
                        return false;
                    }

                    isVaryingsByParams = true;
                }

                isStartAnalyze = true;
            }
            else if (isVaryingsByStruct) {
                return false;
            }
            else if (isVaryingsByParams) {
                if (pParam.semantics === "") {
                    return false;
                }

                if (pParam.type.isContainSampler() ||
                    Effect.isSamplerType(pParam.type)) {
                    return false;
                }

                if (pParam.type.isComplex() &&
                    (pParam.type.hasFieldWithoutSemantic() ||
                        !pParam.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._pParamListForShaderInput.push(pParam);
        }

        if (isVaryingsByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }
}
