import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IInitExprInstruction, ITypeInstruction, EInstructionTypes, IExprInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { Instruction } from "./Instruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Represents:
 *   int a[3] = { 1, 2, 3 };
 *              -----------
 */

export interface IInitExprInstructionSettings extends IExprInstructionSettings {
    args?: IExprInstruction[];
}

export class InitExprInstruction extends ExprInstruction implements IInitExprInstruction {
    private _args: IExprInstruction[];

    // todo: remove
    private _isArray: boolean;

    constructor({ args = [], ...settings }: IInitExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_InitExprInstruction, ...settings });

        this._isArray = false;
        this._args = args.map((arg) => arg.$withParent(this));
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

    optimizeForVariableType(pType: IVariableTypeInstruction): boolean {
        if ((pType.isNotBaseArray() && pType.globalScope) ||
            (pType.isArray() && this.arguments.length > 1)) {


            if (pType.length === Instruction.UNDEFINE_LENGTH ||
                (pType.isNotBaseArray() && this.arguments.length !== pType.length) ||
                (!pType.isNotBaseArray() && this.arguments.length !== pType.baseType.length)) {

                return false;
            }

            if (pType.isNotBaseArray()) {
                this._isArray = true;
            }

            let arrayElementType: IVariableTypeInstruction = <IVariableTypeInstruction>pType.arrayElementType;
            let testedInstruction: IExprInstruction = null;
            let isOk: boolean = false;

            for (let i: number = 0; i < this.arguments.length; i++) {
                testedInstruction = (<IExprInstruction>this.arguments[i]);

                if (testedInstruction.instructionType === EInstructionTypes.k_InitExprInstruction) {
                    isOk = (<IInitExprInstruction>testedInstruction).optimizeForVariableType(arrayElementType);
                    if (!isOk) {
                        return false;
                    }
                }
                else {
                    if (Effect.isSamplerType(arrayElementType)) {
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

            this._type = pType.baseType;
            return true;
        }
        else {
            let firstInstruction: IExprInstruction = <IExprInstruction>this.arguments[0];

            if (this.arguments.length === 1 &&
                firstInstruction.instructionType !== EInstructionTypes.k_InitExprInstruction) {

                if (Effect.isSamplerType(pType)) {
                    if (firstInstruction.instructionType === EInstructionTypes.k_SamplerStateBlockInstruction) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }

                if (firstInstruction.type.isEqual(pType)) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else if (this.arguments.length === 1) {
                return false;
            }

            let args: IInitExprInstruction[] = <IInitExprInstruction[]>this.arguments;
            let fieldNameList: string[] = pType.fieldNames;

            for (let i: number = 0; i < args.length; i++) {
                let pFieldType: IVariableTypeInstruction = pType.getField(fieldNameList[i]).type;
                if (!args[i].optimizeForVariableType(pFieldType)) {
                    return false;
                }
            }

            this._type = pType.baseType;
            return true;
        }
    }

    evaluate(): boolean {
        if (!this.isConst()) {
            this._evalResult = null;
            return false;
        }

        let pRes: any = null;

        if (this._isArray) {
            pRes = new Array(this.arguments.length);

            for (let i: number = 0; i < this.arguments.length; i++) {
                let pEvalInstruction = (<IExprInstruction>this.arguments[i]);

                if (pEvalInstruction.evaluate()) {
                    pRes[i] = pEvalInstruction.getEvalValue();
                }
            }
        }
        else if (this.arguments.length === 1) {
            let pEvalInstruction = (<IExprInstruction>this.arguments[0]);
            pEvalInstruction.evaluate();
            pRes = pEvalInstruction.getEvalValue();
        }
        else {
            let pJSTypeCtor: any = Effect.getExternalType(this.type);
            let pArguments: any[] = new Array(this.arguments.length);

            if (isNull(pJSTypeCtor)) {
                return false;
            }

            try {
                if (Effect.isScalarType(this.type)) {
                    let testedInstruction: IExprInstruction = <IExprInstruction>this.arguments[1];
                    if (this.arguments.length > 2 || !testedInstruction.evaluate()) {
                        return false;
                    }

                    pRes = pJSTypeCtor(testedInstruction.getEvalValue());
                }
                else {
                    for (let i: number = 0; i < this.arguments.length; i++) {
                        let testedInstruction: IExprInstruction = <IExprInstruction>this.arguments[i];

                        if (testedInstruction.evaluate()) {
                            pArguments[i] = testedInstruction.getEvalValue();
                        }
                        else {
                            return false;
                        }
                    }

                    pRes = new pJSTypeCtor;
                    pRes.set.apply(pRes, pArguments);
                }
            }
            catch (e) {
                return false;
            }
        }

        this._evalResult = pRes;
        return true;
    }
}
