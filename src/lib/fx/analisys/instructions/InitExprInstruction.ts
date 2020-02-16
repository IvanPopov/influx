import { isNull } from "@lib/common";
import { instruction, type } from "@lib/fx/analisys/helpers";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, EScopeType, IExprInstruction, IInitExprInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

/**
 * Represents:
 *   int a[3] = { 1, 2, 3 };
 *              -----------
 */

export interface IInitExprInstructionSettings extends IExprInstructionSettings {
    type: IVariableTypeInstruction;
    args?: IExprInstruction[];
}

export class InitExprInstruction extends ExprInstruction implements IInitExprInstruction {
    private _args: IExprInstruction[];

    constructor({ type, args = [], ...settings }: IInitExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_InitExpr, type, ...settings });
        this._args = args.map(arg => Instruction.$withParent(arg, this));
    }


    get args(): IExprInstruction[] {
        return this._args;
    }


    isArray(): boolean {
        return this.type.isNotBaseArray();
    }


    toCode(): string {
        let code: string = '';

        if (!isNull(this.type)) {
            code += this.type.toCode();
        }
        code += "(";

        for (let i: number = 0; i < this.args.length; i++) {
            code += this.args[i].toCode();

            if (i !== this.args.length - 1) {
                code += ",";
            }
        }

        code += ")";

        return code;
    }

    isConst(): boolean {
        let bConst: boolean;
        let args: IExprInstruction[] = <IExprInstruction[]>this.args;

        for (let i: number = 0; i < args.length; i++) {
            if (!args[i].isConst()) {
                return false;
            }
        }

        return true;
    }

    /**
     * 
     * @param type The type of the variable for which the initializer was created.
     */
    // TODO: move it to Analysis.ts
    optimizeForVariableType(type: IVariableTypeInstruction): boolean {
        // It's a global user defined array or just not unit array;
        // Trying to exclude types like float1.
        if ((type.isNotBaseArray() && type.scope.type <= EScopeType.k_Global) ||
            (type.isArray() && this.args.length > 1)) {

            if (type.length === instruction.UNDEFINE_LENGTH ||
                (type.isNotBaseArray() && this.args.length !== type.length) ||
                (!type.isNotBaseArray() && this.args.length !== type.baseType.length)) {
                return false;
            }

            let arrayElementType = <IVariableTypeInstruction>type.arrayElementType;

            for (let i = 0; i < this.args.length; i++) {
                let testedInstruction = (<IExprInstruction>this.args[i]);

                if (testedInstruction.instructionType === EInstructionTypes.k_InitExpr) {
                    if (!(<IInitExprInstruction>testedInstruction).optimizeForVariableType(arrayElementType)) {
                        return false;
                    }
                }
                else {
                    // if (SystemScope.isSamplerType(arrayElementType)) {
                    //     if (testedInstruction.instructionType !== EInstructionTypes.k_SamplerStateBlockExpr) {
                    //         return false;
                    //     }
                    // }
                    // else 
                    {
                        if (!testedInstruction.type.isEqual(arrayElementType)) {
                            return false;
                        }
                    }
                }
            }

            this._type = type.baseType;
            return true;
        }
        else {
            let firstInstruction = <IExprInstruction>this.args[0];

            if (this.args.length === 1 &&
                firstInstruction.instructionType !== EInstructionTypes.k_InitExpr) {

                // if (SystemScope.isSamplerType(type)) {
                //     if (firstInstruction.instructionType === EInstructionTypes.k_SamplerStateBlockExpr) {
                //         return true;
                //     }
                //     else {
                //         return false;
                //     }
                // }

                // TODO: remove this hack!!
                if (firstInstruction.type.isEqual(SystemScope.T_INT) || firstInstruction.type.isEqual(SystemScope.T_UINT)) {
                    if (type.isEqual(SystemScope.T_INT) || type.isEqual(SystemScope.T_UINT)) {
                        return true;
                    }   
                }

                if (firstInstruction.type.isEqual(type)) {
                    return true;
                }
                
                return false;
            }
            else if (this.args.length === 1) {
                return false;
            }

            let args = <IInitExprInstruction[]>this.args;
            let fieldNameList = type.fieldNames;

            for (let i = 0; i < args.length; i++) {
                let fieldType = type.getField(fieldNameList[i]).type;
                if (!args[i].optimizeForVariableType(fieldType)) {
                    return false;
                }
            }

            this._type = type.baseType;
            return true;
        }
    }
}
