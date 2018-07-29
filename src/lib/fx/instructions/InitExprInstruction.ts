import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IInitExprInstruction, ITypeInstruction, EInstructionTypes, IExprInstruction, IVariableTypeInstruction, EScopeType } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";
import * as SystemScope from "../SystemScope";

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

    // Returns true if it is user-defined array.
    private _isArray: boolean; // todo: remove

    constructor({ type, args = [], ...settings }: IInitExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_InitExprInstruction, type, ...settings });

        this._isArray = false;
        this._args = args.map((arg) => arg.$withParent(this));

        // if (!this.optimizeForVariableType(type)) {
        //     context.error(sourceNode, EErrors.InvalidVariableInitializing, { varName: id.name });
        //     return null;
        // }
    }


    get arguments(): IExprInstruction[] {
        return this._args;
    }


    isArray(): boolean {
        return this._isArray;
    }


    toCode(): string {
        let code: string = '';

        if (!isNull(this.type)) {
            code += this.type.toCode();
        }
        code += "(";

        for (let i: number = 0; i < this.arguments.length; i++) {
            code += this.arguments[i].toCode();

            if (i !== this.arguments.length - 1) {
                code += ",";
            }
        }

        code += ")";

        return code;
    }

    isConst(): boolean {
        let bConst: boolean;
        let args: IExprInstruction[] = <IExprInstruction[]>this.arguments;

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
    optimizeForVariableType(type: IVariableTypeInstruction): boolean {
        // It's a global user defined array or just not unit array;
        // Trying to exclude types like float1.
        if ((type.isNotBaseArray() && type.scope.type <= EScopeType.k_Global) ||
            (type.isArray() && this.arguments.length > 1)) {

            if (type.length === Instruction.UNDEFINE_LENGTH ||
                (type.isNotBaseArray() && this.arguments.length !== type.length) ||
                (!type.isNotBaseArray() && this.arguments.length !== type.baseType.length)) {
                return false;
            }

            if (type.isNotBaseArray()) {
                this._isArray = true;
            }

            let arrayElementType = <IVariableTypeInstruction>type.arrayElementType;
            let isOk = false;
            let testedInstruction: IExprInstruction = null;

            for (let i = 0; i < this.arguments.length; i++) {
                testedInstruction = (<IExprInstruction>this.arguments[i]);

                if (testedInstruction.instructionType === EInstructionTypes.k_InitExprInstruction) {
                    isOk = (<IInitExprInstruction>testedInstruction).optimizeForVariableType(arrayElementType);
                    if (!isOk) {
                        return false;
                    }
                }
                else {
                    if (SystemScope.isSamplerType(arrayElementType)) {
                        if (testedInstruction.instructionType !== EInstructionTypes.k_SamplerStateBlockInstruction) {
                            return false;
                        }
                    }
                    else {
                        isOk = testedInstruction.type.isEqual(arrayElementType);
                        if (!isOk) {
                            return false;
                        }
                    }
                }
            }

            this._type = type.baseType;
            return true;
        }
        else {
            let firstInstruction = <IExprInstruction>this.arguments[0];

            if (this.arguments.length === 1 &&
                firstInstruction.instructionType !== EInstructionTypes.k_InitExprInstruction) {

                if (SystemScope.isSamplerType(type)) {
                    if (firstInstruction.instructionType === EInstructionTypes.k_SamplerStateBlockInstruction) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }

                if (firstInstruction.type.isEqual(type)) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else if (this.arguments.length === 1) {
                return false;
            }

            let args = <IInitExprInstruction[]>this.arguments;
            let fieldNameList = type.fieldNames;

            for (let i = 0; i < args.length; i++) {
                let pFieldType: IVariableTypeInstruction = type.getField(fieldNameList[i]).type;
                if (!args[i].optimizeForVariableType(pFieldType)) {
                    return false;
                }
            }

            this._type = type.baseType;
            return true;
        }
    }

    evaluate(): boolean {
        if (!this.isConst()) {
            this._evalResult = null;
            return false;
        }

        let res: any = null;

        if (this._isArray) {
            res = new Array(this.arguments.length);

            for (let i: number = 0; i < this.arguments.length; i++) {
                let evalInstruction = (<IExprInstruction>this.arguments[i]);

                if (evalInstruction.evaluate()) {
                    res[i] = evalInstruction.getEvalValue();
                }
            }
        }
        else if (this.arguments.length === 1) {
            let pEvalInstruction = (<IExprInstruction>this.arguments[0]);
            pEvalInstruction.evaluate();
            res = pEvalInstruction.getEvalValue();
        }
        else {
            let jsTypeCtor: any = SystemScope.getExternalType(this.type);
            let args: any[] = new Array(this.arguments.length);

            if (isNull(jsTypeCtor)) {
                return false;
            }

            try {
                if (SystemScope.isScalarType(this.type)) {
                    let testedInstruction: IExprInstruction = <IExprInstruction>this.arguments[1];
                    if (this.arguments.length > 2 || !testedInstruction.evaluate()) {
                        return false;
                    }

                    res = jsTypeCtor(testedInstruction.getEvalValue());
                }
                else {
                    for (let i: number = 0; i < this.arguments.length; i++) {
                        let testedInstruction: IExprInstruction = <IExprInstruction>this.arguments[i];

                        if (testedInstruction.evaluate()) {
                            args[i] = testedInstruction.getEvalValue();
                        }
                        else {
                            return false;
                        }
                    }

                    res = new jsTypeCtor;
                    res.set.apply(res, args);
                }
            }
            catch (e) {
                return false;
            }
        }

        this._evalResult = res;
        return true;
    }
}
