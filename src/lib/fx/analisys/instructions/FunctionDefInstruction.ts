import { isNull } from "@lib/common";
import { DeclInstruction, IDeclInstructionSettings } from "@lib/fx/analisys/instructions/DeclInstruction";
import { Instruction } from "@lib/fx/analisys/instructions/Instruction";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, IFunctionDefInstruction, IIdInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

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
    readonly params: IVariableDeclInstruction[];
    readonly returnType: IVariableTypeInstruction;
    readonly _id: IIdInstruction;

    constructor({ returnType, id, paramList = [], ...settings }: IFunctionDefInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDef, ...settings });

        this.params = paramList.map(param => Instruction.$withParent(param, this));
        this.returnType = Instruction.$withParent(returnType, this);
        this._id = Instruction.$withParent(id, this);
    }


    get name(): string {
        return this._id.name;
    }


    get numArgsRequired(): number {
        // todo: check order!!
        return this.params.filter((param) => !param || !param.initExpr).length;
    }


    get signature(): string {
        const { name, returnType, params } = this;
        return `${returnType.name} ${name}(${params.map(param => {
            if (param) {
                const type = param.type;
                const usages = type.usages.length > 0 ? `${type.usages.join(' ')} ` : '';
                return `${usages}${type.name}${param.initExpr? '?':''}`;
            }
            return  '*';
        }).join(', ')})`;
    }


    toString(): string {
        let def = this.returnType.hash + " " + this.name + "(";

        for (let i: number = 0; i < this.params.length; i++) {
            def += this.params[i].type.hash + ",";
        }

        def += ")";
        // todo: add semantic
        return def;
    }


    toCode(): string {
        const { id, returnType, params } = this;
        return `${returnType.toCode()} ${id.toCode()}(${params.map(param => param.toCode()).join(', ')})`;
    }


    // TOOD: move this code to analyzer!
    static checkForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        if (!FunctionDefInstruction.checkReturnTypeForVertexUsage(funcDef)) {
            return false;
        }

        if (!FunctionDefInstruction.checkArgumentsForVertexUsage(funcDef)) {
            return false;
        }

        return true;
    }

    // TOOD: move this code to analyzer!
    static checkForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
        if (!FunctionDefInstruction.checkReturnTypeForPixelUsage(funcDef)) {
            return false;
        }

        if (!FunctionDefInstruction.checkArgumentsForPixelUsage(funcDef)) {
            return false;
        }

        return true;
    }


    // TOOD: move this code to analyzer!
    static checkReturnTypeForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        const returnType = <IVariableTypeInstruction>funcDef.returnType;

        if (returnType.isEqual(SystemScope.T_VOID)) {
            return true;
        }

        if (returnType.isComplex()) {
            if (returnType.hasFieldWithoutSemantics()) {
                return false;
            }

            if (!returnType.hasAllUniqueSemantics()) {
                return false;
            }

            // isGood = returnType._hasFieldWithSematic("POSITION");
            // if(!isGood){
            // 	return false;
            // }

            // samplers cant be interpolators
            if (returnType.isContainSampler()) {
                return false;
            }

            // Forbid fileds with user-defined types
            // or any other complex types.
            if (returnType.isContainComplexType()) {
                return false;
            }
        } else {
            if (!returnType.isEqual(SystemScope.T_FLOAT4)) {
                return false;
            }

            if (funcDef.semantic !== "POSITION") {
                return false;
            }
        }

        return true;
    }

    // todo: add support for dual source blending
    // todo: add support for MRT
    static checkReturnTypeForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
        let returnType = <IVariableTypeInstruction>funcDef.returnType;

        if (returnType.isEqual(SystemScope.T_VOID)) {
            return true;
        }

        // TODO: add MRT support
        if (!returnType.isBase()) {
            return false;
        }

        if (!returnType.isEqual(SystemScope.T_FLOAT4)) {
            return false;
        }

        if (funcDef.semantic !== "COLOR") {
            return false;
        }

        return true;
    }
   

    static checkArgumentsForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
        let params = funcDef.params;
        let isAttributeByStruct = false;
        let isAttributeByParams = false;
        let isStartAnalyze = false;

        for (let i: number = 0; i < params.length; i++) {
            let param = params[i];

            if (param.isUniform()) {
                continue;
            }

            if (!isStartAnalyze) {
                if (isNull(param.semantic)) {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics()) {
                        return false;
                    }

                    isAttributeByStruct = true;
                } else if (!isNull(param.semantic)) {
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
                if (isNull(param.semantic)) {
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
        let params = funcDef.params;
        let isVaryingsByStruct = false;
        let isVaryingsByParams = false;
        let isStartAnalyze = false;

        for (let i: number = 0; i < params.length; i++) {
            let param: IVariableDeclInstruction = params[i];

            if (param.isUniform()) {
                continue;
            }

            if (!isStartAnalyze) {
                if (param.semantic === "") {
                    if (param.type.isBase() ||
                        param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics() ||
                        param.type.isContainSampler()) {
                        return false;
                    }

                    isVaryingsByStruct = true;
                } else if (param.semantic !== "") {
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
                if (param.semantic === "") {
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
