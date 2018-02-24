import { DeclInstruction } from "./DeclInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IVariableDeclInstruction, IVariableTypeInstruction, IIdInstruction, EInstructionTypes, ITypeInstruction, IInstruction, IFunctionDefInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";
import { isNull } from "../../common";

/**
 * Represent type func(...args)[:Semantic]
 * EMPTY_OPERTOR VariableTypeInstruction IdInstruction VarDeclInstruction ... VarDeclInstruction
 */
export class FunctionDefInstruction extends DeclInstruction implements IFunctionDefInstruction {
    private _pParameterList: IVariableDeclInstruction[];
    private _pParamListForShaderCompile: IVariableDeclInstruction[];
    private _pParamListForShaderInput: IVariableDeclInstruction[];
    private _bIsComplexShaderInput: boolean;

    private _pReturnType: IVariableTypeInstruction;
    private _pFunctionName: IIdInstruction;
    private _nParamsRequired: number;
    private _sDefinition: string;
    
    private _isAnalyzedForVertexUsage: boolean;
    private _isAnalyzedForPixelUsage: boolean;
    private _bCanUsedAsFunction: boolean;

    private _bShaderDef: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_FunctionDefInstruction);
        this._pParameterList = [];
        this._pParamListForShaderInput = [];
        this._pParamListForShaderCompile = [];
        this._bIsComplexShaderInput = false;
        this._pReturnType = null;
        this._nParamsRequired = 0;
        this._pFunctionName = null;
        this._sDefinition = null;
        this._isAnalyzedForPixelUsage = false;
        this._isAnalyzedForVertexUsage = false;
        this._bCanUsedAsFunction = true;
        this._bShaderDef = false;
    }

    
    set type(pType: ITypeInstruction) {
        this.returnType = (<IVariableTypeInstruction>pType);
    }

    get type(): ITypeInstruction {
        return <ITypeInstruction>this.returnType;
    }

    set returnType(pReturnType: IVariableTypeInstruction) {
        this._pReturnType = pReturnType;
        pReturnType.parent = (this);
    }

    get returnType(): IVariableTypeInstruction {
        return this._pReturnType;
    }

    set functionName(pNameId: IIdInstruction) {
        this._pFunctionName = pNameId;
        pNameId.parent = (this);
    }

    get name(): string {
        return this._pFunctionName.name;
    }

    get realName(): string {
        return this._pFunctionName.realName;
    }

    get functionName(): IIdInstruction {
        return this._pFunctionName;
    }

    get arguments(): IVariableDeclInstruction[] {
        return this._pParameterList;
    }

    get numArgsRequired(): number {
        return this._nParamsRequired;
    }

    set shaderDef(isShaderDef: boolean) {
        this._bShaderDef = isShaderDef;
    }

    get shaderDef(): boolean {
        return this._bShaderDef;
    }

    get stringDef(): string {
        if (isNull(this._sDefinition)) {
            this._sDefinition = this._pReturnType.hash + " " + this.name + "(";

            for (var i: number = 0; i < this._pParameterList.length; i++) {
                this._sDefinition += this._pParameterList[i].type.hash + ",";
            }

            this._sDefinition += ")";
        }

        return this._sDefinition;
    }

    get paramListForShaderInput(): IVariableDeclInstruction[] {
        return this._pParamListForShaderInput;
    }


    toCode(): string {
        var sCode: string = "";

        if (!this.shaderDef) {

            sCode += this._pReturnType.toCode();
            sCode += " " + this._pFunctionName.toCode();
            sCode += "(";

            for (var i: number = 0; i < this._pParameterList.length; i++) {
                sCode += this._pParameterList[i].toCode();

                if (i !== this._pParameterList.length - 1) {
                    sCode += ",";
                }
            }

            sCode += ")";
        }
        else {
            sCode = "void " + this._pFunctionName.toCode() + "()";
        }

        return sCode;
    }

    addParameter(pParameter: IVariableDeclInstruction, isStrictModeOn?: boolean): boolean {
        if (this._pParameterList.length > this._nParamsRequired &&
            !pParameter.initializeExpr) {

            this._setError(EEffectErrors.BAD_FUNCTION_PARAMETER_DEFENITION_NEED_DEFAULT,
                {
                    funcName: this._pFunctionName.name,
                    varName: pParameter.name
                });
            return false;
        }

        var pParameterType: IVariableTypeInstruction = pParameter.type;

        this._pParameterList.push(pParameter);
        pParameter.parent = (this);

        if (!pParameter.initializeExpr) {
            this._nParamsRequired++;
        }

        return true;
    }


    isComplexShaderInput(): boolean {
        return this._bIsComplexShaderInput;
    }


    setShaderParams(pParamList: IVariableDeclInstruction[], isComplexInput: boolean): void {
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


    canUsedAsFunction(): boolean {
        return this._bCanUsedAsFunction;
    }

    checkForVertexUsage(): boolean {
        if (this._isAnalyzedForVertexUsage) {
            return this.vertex;
        }

        this._isAnalyzedForVertexUsage = true;

        var isGood: boolean = true;

        isGood = this.checkReturnTypeForVertexUsage();
        if (!isGood) {
            this.vertex = (false);
            return false;
        }

        isGood = this.checkArgumentsForVertexUsage();
        if (!isGood) {
            this.vertex = (false);
            return false;
        }

        this.vertex = (true);

        return true;
    }

    checkForPixelUsage(): boolean {
        if (this._isAnalyzedForPixelUsage) {
            return this.pixel;
        }

        this._isAnalyzedForPixelUsage = true;

        var isGood: boolean = true;

        isGood = this.checkReturnTypeForPixelUsage();
        if (!isGood) {
            this.pixel = (false);
            return false;
        }

        isGood = this.checkArgumentsForPixelUsage();
        if (!isGood) {
            this.pixel = (false);
            return false;
        }

        this.pixel = (true);

        return true;
    }

    private checkReturnTypeForVertexUsage(): boolean {
        var pReturnType: IVariableTypeInstruction = this._pReturnType;
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
        var pReturnType: IVariableTypeInstruction = this._pReturnType;
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
        var pArguments: IVariableDeclInstruction[] = this._pParameterList;
        var isAttributeByStruct: boolean = false;
        var isAttributeByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._pParamListForShaderInput = [];
        this._pParamListForShaderCompile = [];

        for (var i: number = 0; i < pArguments.length; i++) {
            var pParam: IVariableDeclInstruction = pArguments[i];

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
        var pArguments: IVariableDeclInstruction[] = this._pParameterList;
        var isVaryingsByStruct: boolean = false;
        var isVaryingsByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._pParamListForShaderInput = [];
        this._pParamListForShaderCompile = [];

        for (var i: number = 0; i < pArguments.length; i++) {
            var pParam: IVariableDeclInstruction = pArguments[i];

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
