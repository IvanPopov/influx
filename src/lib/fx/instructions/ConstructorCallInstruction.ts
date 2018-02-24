import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, EVarUsedMode, ITypeUseInfoContainer, IAnalyzedInstruction, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { isNull } from "../../common";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Respresnt ctor(arg1,..., argn)
 * EMPTY_OPERATOR IdInstruction ExprInstruction ... ExprInstruction 
 */
export class ConstructorCallInstruction extends ExprInstruction {
    
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ConstructorCallInstruction);
    }


    toCode(): string {
        var sCode: string = "";

        sCode += this.instructions[0].toCode();
        sCode += "(";

        for (var i: number = 1; i < this.instructions.length; i++) {
            sCode += this.instructions[i].toCode();
            if (i !== this.instructions.length - 1) {
                sCode += ",";
            }
        }

        sCode += ")";

        return sCode;
    }


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAnalyzedInstruction[] = <IAnalyzedInstruction[]>this.instructions;
        for (var i: number = 1; i < this.instructions.length; i++) {
            pInstructionList[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        }
    }


    isConst(): boolean {
        for (var i: number = 1; i < this.instructions.length; i++) {
            if (!(<IExprInstruction>this.instructions[i]).isConst()) {
                return false;
            }
        }

        return true;
    }

    evaluate(): boolean {
        if (!this.isConst()) {
            return false;
        }

        var pRes: any = null;
        var pJSTypeCtor: any = Effect.getExternalType(this.type);
        var pArguments: any[] = new Array(this.instructions.length - 1);

        if (isNull(pJSTypeCtor)) {
            return false;
        }

        try {
            if (Effect.isScalarType(this.type)) {
                var pTestedInstruction: IExprInstruction = <IExprInstruction>this.instructions[1];
                if (this.instructions.length > 2 || !pTestedInstruction.evaluate()) {
                    return false;
                }

                pRes = pJSTypeCtor(pTestedInstruction.getEvalValue());
            }
            else {
                for (var i: number = 1; i < this.instructions.length; i++) {
                    var pTestedInstruction: IExprInstruction = <IExprInstruction>this.instructions[i];

                    if (pTestedInstruction.evaluate()) {
                        pArguments[i - 1] = pTestedInstruction.getEvalValue();
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

        this._pLastEvalResult = pRes;
        return true;
    }
}
