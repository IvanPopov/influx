import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IVariableDeclInstruction, IAnnotationInstruction, IVariableTypeInstruction, IIdInstruction, EInstructionTypes, ITypeInstruction, IInstruction, IFunctionDefInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { EAnalyzerErrors, EAnalyzerWarnings } from '../../idl/EAnalyzerErrors';
import * as SystemScope from "../SystemScope";
import { isNull } from "../../common";
import { Instruction } from "./Instruction";


export interface IFunctionDefInstructionSettings extends IDeclInstructionSettings {
    returnType: IVariableTypeInstruction;
    id: IIdInstruction;
    paramList?: IVariableDeclInstruction[];
}


/**
 * Represent type func(...args)[:Semantic]
 * EMPTY_OPERTOR VariableTypeInstruction IdInstruction VarDeclInstruction ... VarDeclInstruction
 */
export class FunctionDefInstruction extends DeclInstruction implements IFunctionDefInstruction {
    protected _parameterList: IVariableDeclInstruction[];
    protected _returnType: IVariableTypeInstruction;
    protected _id: IIdInstruction;

    constructor({ returnType, id, paramList = [], ...settings }: IFunctionDefInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDefInstruction, ...settings });

        this._parameterList = paramList.map(param => Instruction.$withParent(param, this));
        this._returnType = Instruction.$withParent(returnType, this);
        this._id = Instruction.$withParent(id, this);
    }


    get returnType(): IVariableTypeInstruction {
        return this._returnType;
    }


    get name(): string {
        return this._id.name;
    }


    get functionName(): IIdInstruction {
        return this._id;
    }


    get paramList(): IVariableDeclInstruction[] {
        return this._parameterList;
    }


    get numArgsRequired(): number {
        // todo: check order!!
        return this._parameterList.filter((param) => !param.initExpr).length;
    }


    toString(): string {
        let def = this._returnType.hash + " " + this.name + "(";

        for (let i: number = 0; i < this._parameterList.length; i++) {
            def += this._parameterList[i].type.hash + ",";
        }

        def += ")";
        // todo: add semantics
        return def;
    }


    toCode(): string {
        let code = "";

        {

            code += this._returnType.toCode();
            code += " " + this._id.toCode();
            code += "(";

            for (let i: number = 0; i < this._parameterList.length; i++) {
                code += this._parameterList[i].toCode();

                if (i !== this._parameterList.length - 1) {
                    code += ",";
                }
            }

            code += ")";
        }
        // else {
        //     code = "void " + this._id.toCode() + "()";
        // }

        return code;
    }


    static checkForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        if (!FunctionDefInstruction.checkReturnTypeForVertexUsage(funcDef)) {
            return false;
        }

        if (!FunctionDefInstruction.checkArgumentsForVertexUsage(funcDef)) {
            return false;
        }

        return true;
    }

    static checkForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
        if (!FunctionDefInstruction.checkReturnTypeForPixelUsage(funcDef)) {
            return false;
        }

        if (!FunctionDefInstruction.checkArgumentsForPixelUsage(funcDef)) {
            return false;
        }

        return true;
    }


    static checkReturnTypeForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        let returnType = <IVariableTypeInstruction>funcDef.returnType;
        let isGood = true;

        if (returnType.isEqual(SystemScope.T_VOID)) {
            return true;
        }

        if (returnType.isComplex()) {
            isGood = !returnType.hasFieldWithoutSemantics();
            if (!isGood) {
                return false;
            }

            isGood = returnType.hasAllUniqueSemantics();
            if (!isGood) {
                return false;
            }

            // isGood = returnType._hasFieldWithSematic("POSITION");
            // if(!isGood){
            // 	return false;
            // }

            isGood = !returnType.isContainSampler();
            if (!isGood) {
                return false;
            }

            isGood = !returnType.isContainComplexType();
            if (!isGood) {
                return false;
            }

            return true;
        } else {
            isGood = returnType.isEqual(SystemScope.T_FLOAT4);
            if (!isGood) {
                return false;
            }

            isGood = (funcDef.semantics === "POSITION");
            if (!isGood) {
                return false;
            }

            return true;
        }
    }

    // todo: add support for dual source blending
    // todo: add support for MRT
    static checkReturnTypeForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
        let returnType = <IVariableTypeInstruction>funcDef.returnType;
        let isGood: boolean = true;

        if (returnType.isEqual(SystemScope.T_VOID)) {
            return true;
        }

        isGood = returnType.isBase();
        if (!isGood) {
            return false;
        }

        isGood = returnType.isEqual(SystemScope.T_FLOAT4);
        if (!isGood) {
            return false;
        }

        isGood = funcDef.semantics === "COLOR";
        if (!isGood) {
            return false;
        }

        return true;
    }


    // should be called only after checkArgumentsFor[Vertex|Pixel]Usage
    static fetchShaderInput(funcDef: IFunctionDefInstruction): IVariableDeclInstruction[] {
        let params = funcDef.paramList;
        let shaderInput: IVariableDeclInstruction[] = [];

        for (let i: number = 0; i < params.length; i++) {
            let param = params[i];
            if (param.isUniform()) {
                continue;
            }
            shaderInput.push(param);
        }

        return shaderInput;
    }

    static hasComplexShaderInput(funcDef: IFunctionDefInstruction): boolean {
        let params = funcDef.paramList;

        for (let i: number = 0; i < params.length; i++) {
            let param = params[i];
            if (param.isUniform()) {
                continue;
            }
         
            if (isNull(param.semantics)) {
                return true;
            } 
        }

        return false;
    }

    /*
    static checkArgumentsForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        let params = funcDef.arguments;
        let isAttributeByStruct = false;
        let isAttributeByParams = false;
        let isStartAnalyze = false;

        for (let i: number = 0; i < params.length; i++) {
            let param = params[i];

            if (param.isUniform()) {
                this._paramListForShaderCompile.push(param);
                continue;
            }

            if (!isStartAnalyze) {
                if (isNull(param.semantics)) {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics()) {
                        return false;
                    }

                    isAttributeByStruct = true;
                } else if (!isNull(param.semantics)) {
                    if (param.type.isComplex() &&
                        (param.type.hasFieldWithoutSemantics() ||
                            !param.type.hasAllUniqueSemantics())) {
                        return false;
                    }

                    isAttributeByParams = true;
                }

                isStartAnalyze = true;
            } else if (isAttributeByStruct) {
                return false;
            } else if (isAttributeByParams) {
                if (param.semantics === "") {
                    return false;
                }

                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._paramListForShaderInput.push(param);
        }

        if (isAttributeByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }


    private checkArgumentsForPixelUsage(): boolean {
        let params: IVariableDeclInstruction[] = this._parameterList;
        let isVaryingsByStruct: boolean = false;
        let isVaryingsByParams: boolean = false;
        let isStartAnalyze: boolean = false;

        for (let i: number = 0; i < params.length; i++) {
            let param: IVariableDeclInstruction = params[i];

            if (param.isUniform()) {
                this._paramListForShaderCompile.push(param);
                continue;
            }

            if (!isStartAnalyze) {
                if (param.semantics === "") {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics() ||
                        param.type.isContainSampler()) {
                        return false;
                    }

                    isVaryingsByStruct = true;
                }
                else if (param.semantics !== "") {
                    if (param.type.isContainSampler() ||
                        Effect.isSamplerType(param.type)) {
                        return false;
                    }

                    if (param.type.isComplex() &&
                        (param.type.hasFieldWithoutSemantics() ||
                            !param.type.hasAllUniqueSemantics())) {
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
                if (param.semantics === "") {
                    return false;
                }

                if (param.type.isContainSampler() ||
                    Effect.isSamplerType(param.type)) {
                    return false;
                }

                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }

            this._paramListForShaderInput.push(param);
        }

        if (isVaryingsByStruct) {
            this._bIsComplexShaderInput = true;
        }

        return true;
    }

    */

    static checkArgumentsForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        let params = funcDef.paramList;
        let isAttributeByStruct = false;
        let isAttributeByParams = false;
        let isStartAnalyze = false;

        for (let i: number = 0; i < params.length; i++) {
            let param = params[i];

            if (param.isUniform()) {
                continue;
            }

            if (!isStartAnalyze) {
                if (isNull(param.semantics)) {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics()) {
                        return false;
                    }

                    isAttributeByStruct = true;
                } else if (!isNull(param.semantics)) {
                    if (param.type.isComplex() &&
                        (param.type.hasFieldWithoutSemantics() ||
                            !param.type.hasAllUniqueSemantics())) {
                        return false;
                    }

                    isAttributeByParams = true;
                }

                isStartAnalyze = true;
            } else if (isAttributeByStruct) {
                return false;
            } else if (isAttributeByParams) {
                if (isNull(param.semantics)) {
                    return false;
                }

                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }
        }

        return true;
    }


    static checkArgumentsForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
        let params = funcDef.paramList;
        let isVaryingsByStruct = false;
        let isVaryingsByParams = false;
        let isStartAnalyze = false;

        for (let i: number = 0; i < params.length; i++) {
            let param: IVariableDeclInstruction = params[i];

            if (param.isUniform()) {
                continue;
            }

            if (!isStartAnalyze) {
                if (param.semantics === "") {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics() ||
                        param.type.isContainSampler()) {
                        return false;
                    }

                    isVaryingsByStruct = true;
                } else if (param.semantics !== "") {
                    if (param.type.isContainSampler() ||
                        SystemScope.isSamplerType(param.type)) {
                        return false;
                    }

                    if (param.type.isComplex() &&
                        (param.type.hasFieldWithoutSemantics() ||
                            !param.type.hasAllUniqueSemantics())) {
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
                if (param.semantics === "") {
                    return false;
                }

                if (param.type.isContainSampler() ||
                    SystemScope.isSamplerType(param.type)) {
                    return false;
                }

                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }
            }
        }

        return true;
    }
}
