import { ExprInstruction } from "./ExprInstruction";
import { IInitExprInstruction, ITypeInstruction, EInstructionTypes, IExprInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { Instruction } from "./Instruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class InitExprInstruction extends ExprInstruction implements IInitExprInstruction {
    private _isArray: boolean;
    private _args: IExprInstruction[];

    constructor(node: IParseNode, type: ITypeInstruction, args: IExprInstruction[]) {
        super(node, type, EInstructionTypes.k_InitExprInstruction);

        this._isArray = false;
        this._args = args;
    }


    get arguments(): IExprInstruction[] {
        return this._args;
    }


    isArray(): boolean {
        return this._isArray;
    }


    toCode(): string {
        var code: string = '';

        if (!isNull(this.type)) {
            code += this.type.toCode();
        }
        code += "(";

        for (var i: number = 0; i < this.arguments.length; i++) {
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
        var pInstructionList: IExprInstruction[] = <IExprInstruction[]>this.arguments;

        for (var i: number = 0; i < pInstructionList.length; i++) {
            if (!pInstructionList[i].isConst()) {
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

            var pArrayElementType: IVariableTypeInstruction = pType.arrayElementType;
            var pTestedInstruction: IExprInstruction = null;
            var isOk: boolean = false;

            for (var i: number = 0; i < this.arguments.length; i++) {
                pTestedInstruction = (<IExprInstruction>this.arguments[i]);

                if (pTestedInstruction.instructionType === EInstructionTypes.k_InitExprInstruction) {
                    isOk = (<IInitExprInstruction>pTestedInstruction).optimizeForVariableType(pArrayElementType);
                    if (!isOk) {
                        return false;
                    }
                }
                else {
                    if (Effect.isSamplerType(pArrayElementType)) {
                        if (pTestedInstruction.instructionType !== EInstructionTypes.k_SamplerStateBlockInstruction) {
                            return false;
                        }
                    }
                    else {
                        isOk = pTestedInstruction.type.isEqual(pArrayElementType);
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
            var pFirstInstruction: IExprInstruction = <IExprInstruction>this.arguments[0];

            if (this.arguments.length === 1 &&
                pFirstInstruction.instructionType !== EInstructionTypes.k_InitExprInstruction) {

                if (Effect.isSamplerType(pType)) {
                    if (pFirstInstruction.instructionType === EInstructionTypes.k_SamplerStateBlockInstruction) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }

                if (pFirstInstruction.type.isEqual(pType)) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else if (this.arguments.length === 1) {
                return false;
            }

            var pInstructionList: IInitExprInstruction[] = <IInitExprInstruction[]>this.arguments;
            var pFieldNameList: string[] = pType.fieldNameList;

            for (var i: number = 0; i < pInstructionList.length; i++) {
                var pFieldType: IVariableTypeInstruction = pType.getFieldType(pFieldNameList[i]);
                if (!pInstructionList[i].optimizeForVariableType(pFieldType)) {
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

        var pRes: any = null;

        if (this._isArray) {
            pRes = new Array(this.arguments.length);

            for (var i: number = 0; i < this.arguments.length; i++) {
                var pEvalInstruction = (<IExprInstruction>this.arguments[i]);

                if (pEvalInstruction.evaluate()) {
                    pRes[i] = pEvalInstruction.getEvalValue();
                }
            }
        }
        else if (this.arguments.length === 1) {
            var pEvalInstruction = (<IExprInstruction>this.arguments[0]);
            pEvalInstruction.evaluate();
            pRes = pEvalInstruction.getEvalValue();
        }
        else {
            var pJSTypeCtor: any = Effect.getExternalType(this.type);
            var pArguments: any[] = new Array(this.arguments.length);

            if (isNull(pJSTypeCtor)) {
                return false;
            }

            try {
                if (Effect.isScalarType(this.type)) {
                    var pTestedInstruction: IExprInstruction = <IExprInstruction>this.arguments[1];
                    if (this.arguments.length > 2 || !pTestedInstruction.evaluate()) {
                        return false;
                    }

                    pRes = pJSTypeCtor(pTestedInstruction.getEvalValue());
                }
                else {
                    for (var i: number = 0; i < this.arguments.length; i++) {
                        var pTestedInstruction: IExprInstruction = <IExprInstruction>this.arguments[i];

                        if (pTestedInstruction.evaluate()) {
                            pArguments[i] = pTestedInstruction.getEvalValue();
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
