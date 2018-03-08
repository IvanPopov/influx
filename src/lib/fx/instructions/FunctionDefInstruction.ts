import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IVariableDeclInstruction, IAnnotationInstruction, IVariableTypeInstruction, IIdInstruction, EInstructionTypes, ITypeInstruction, IInstruction, IFunctionDefInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { EEffectErrors } from "../../idl/EEffectErrors";
import * as Effect from "../Effect";
import { isNull } from "../../common";


export interface IFunctionDefInstructionSettings extends IDeclInstructionSettings {
    returnType: IVariableTypeInstruction;
    id: IIdInstruction;
    args?: IVariableDeclInstruction[];
}


/**
 * Represent type func(...args)[:Semantic]
 * EMPTY_OPERTOR VariableTypeInstruction IdInstruction VarDeclInstruction ... VarDeclInstruction
 */
export class FunctionDefInstruction extends DeclInstruction implements IFunctionDefInstruction {
    protected _parameterList: IVariableDeclInstruction[];
    protected _paramListForShaderCompile: IVariableDeclInstruction[];
    protected _paramListForShaderInput: IVariableDeclInstruction[];
    
    protected _returnType: IVariableTypeInstruction;
    protected _functionName: IIdInstruction;
    
    // todo: remove
    // Specifies whether to use as shader main function.
    protected _bShaderDef: boolean;
    // Specifies whether the parameters are suitable for the shader.
    protected _bIsComplexShaderInput: boolean;


    protected _bForVertex: boolean;
    protected _bForPixel: boolean;

    constructor({ returnType, id, args = [], ...settings }: IFunctionDefInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDefInstruction, ...settings });

        this._parameterList = args || [];
        this._returnType = returnType;
        this._functionName = name;

        this._paramListForShaderInput = [];
        this._paramListForShaderCompile = [];
        this._bIsComplexShaderInput = false;
        this._bShaderDef = false;

        this._bForVertex = true;
        this._bForPixel = true;
    }


    get returnType(): IVariableTypeInstruction {
        return this._returnType;
    }

    
    get name(): string {
        return this._functionName.name;
    }


    get functionName(): IIdInstruction {
        return this._functionName;
    }


    get arguments(): IVariableDeclInstruction[] {
        return this._parameterList;
    }


    get numArgsRequired(): number {
        // todo: check order!!
        return this._parameterList.filter((param) => !!param.initExpr).length;
    }


    get vertex(): boolean {
        return this._bForVertex;
    }

    
    get pixel(): boolean {
        return this._bForPixel;
    }


    get shaderInput(): IVariableDeclInstruction[] {
        return this._paramListForShaderInput;
    }


    // todo: remove
    isShader() {
        return this._bShaderDef;
    }


    toString(): string {
        let def = this._returnType.hash + " " + this.name + "(";

        for (var i: number = 0; i < this._parameterList.length; i++) {
            def += this._parameterList[i].type.hash + ",";
        }

        def += ")";
        // todo: add semantics
        return def;
    }


    toCode(): string {
        var code: string = "";

        if (!this.isShader()) {

            code += this._returnType.toCode();
            code += " " + this._functionName.toCode();
            code += "(";

            for (var i: number = 0; i < this._parameterList.length; i++) {
                code += this._parameterList[i].toCode();

                if (i !== this._parameterList.length - 1) {
                    code += ",";
                }
            }

            code += ")";
        }
        else {
            code = "void " + this._functionName.toCode() + "()";
        }

        return code;
    }

    // addParameter(pParameter: IVariableDeclInstruction, isStrictModeOn?: boolean): boolean {
    //     if (this._parameterList.length > this._nParamsRequired &&
    //         !pParameter.initExpr) {

    //         this._setError(EEffectErrors.BAD_FUNCTION_PARAMETER_DEFENITION_NEED_DEFAULT,
    //             {
    //                 funcName: this._functionName.name,
    //                 varName: pParameter.name
    //             });
    //         return false;
    //     }

    //     var pParameterType: IVariableTypeInstruction = pParameter.type;

    //     this._parameterList.push(pParameter);
    //     pParameter.parent = (this);

    //     if (!pParameter.initExpr) {
    //         this._nParamsRequired++;
    //     }

    //     return true;
    // }


    isComplexShaderInput(): boolean {
        return this._bIsComplexShaderInput;
    }


    canUsedAsFunction(): boolean {
        return true;
    }

    checkForVertexUsage(): boolean {
        var isGood: boolean = true;

        isGood = this.checkReturnTypeForVertexUsage();
        if (!isGood) {
            this._bForVertex = false;
            return false;
        }

        isGood = this.checkArgumentsForVertexUsage();
        if (!isGood) {
            this._bForVertex = false;
            return false;
        }

        this._bForVertex = true;
        return true;
    }

    checkForPixelUsage(): boolean {
        var isGood: boolean = true;

        isGood = this.checkReturnTypeForPixelUsage();
        if (!isGood) {
            this._bForPixel = false;
            return false;
        }

        isGood = this.checkArgumentsForPixelUsage();
        if (!isGood) {
            this._bForPixel = false;
            return false;
        }

        this._bForPixel = true;
        return true;
    }

    private checkReturnTypeForVertexUsage(): boolean {
        var pReturnType: IVariableTypeInstruction = this._returnType;
        var isGood: boolean = true;

        if (pReturnType.isEqual(Effect.getSystemType("void"))) {
            return true;
        }

        if (pReturnType.isComplex()) {
            isGood = !pReturnType.hasFieldWithoutSemantics();
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
        var pReturnType: IVariableTypeInstruction = this._returnType;
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
        var params: IVariableDeclInstruction[] = this._parameterList;
        var isAttributeByStruct: boolean = false;
        var isAttributeByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._paramListForShaderInput = [];
        this._paramListForShaderCompile = [];

        for (var i: number = 0; i < params.length; i++) {
            var pParam: IVariableDeclInstruction = params[i];

            if (pParam.isUniform()) {
                this._paramListForShaderCompile.push(pParam);
                continue;
            }

            if (!isStartAnalyze) {
                if (pParam.semantics === "") {
                    if (pParam.type.isBase() ||
                        pParam.type.hasFieldWithoutSemantics() ||
                        !pParam.type.hasAllUniqueSemantics()) {
                        return false;
                    }

                    isAttributeByStruct = true;
                }
                else if (pParam.semantics !== "") {
                    if (pParam.type.isComplex() &&
                        (pParam.type.hasFieldWithoutSemantics() ||
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
                    (pParam.type.hasFieldWithoutSemantics() ||
                        !pParam.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._paramListForShaderInput.push(pParam);
        }

        if (isAttributeByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }

    private checkArgumentsForPixelUsage(): boolean {
        var params: IVariableDeclInstruction[] = this._parameterList;
        var isVaryingsByStruct: boolean = false;
        var isVaryingsByParams: boolean = false;
        var isStartAnalyze: boolean = false;

        this._paramListForShaderInput = [];
        this._paramListForShaderCompile = [];

        for (var i: number = 0; i < params.length; i++) {
            var pParam: IVariableDeclInstruction = params[i];

            if (pParam.isUniform()) {
                this._paramListForShaderCompile.push(pParam);
                continue;
            }

            if (!isStartAnalyze) {
                if (pParam.semantics === "") {
                    if (pParam.type.isBase() ||
                        pParam.type.hasFieldWithoutSemantics() ||
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
                        (pParam.type.hasFieldWithoutSemantics() ||
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
                    (pParam.type.hasFieldWithoutSemantics() ||
                        !pParam.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._paramListForShaderInput.push(pParam);
        }

        if (isVaryingsByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }

    $makeShader() {
        this._bShaderDef = true;
    }

    $overwriteType(): void {
        this._bShaderDef = true;
    }
}
