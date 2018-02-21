import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, EVarUsedMode, IAFXTypeUseInfoContainer, IAFXAnalyzedInstruction, IAFXExprInstruction } from "../../idl/IAFXInstruction";
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
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_ConstructorCallInstruction;
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

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pInstructionList: IAFXAnalyzedInstruction[] = <IAFXAnalyzedInstruction[]>this.instructions;
        for (var i: number = 1; i < this.instructions.length; i++) {
            pInstructionList[i].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        }
    }

    isConst(): boolean {
        for (var i: number = 1; i < this.instructions.length; i++) {
            if (!(<IAFXExprInstruction>this.instructions[i]).isConst()) {
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
                var pTestedInstruction: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[1];
                if (this.instructions.length > 2 || !pTestedInstruction.evaluate()) {
                    return false;
                }

                pRes = pJSTypeCtor(pTestedInstruction.getEvalValue());
            }
            else {
                for (var i: number = 1; i < this.instructions.length; i++) {
                    var pTestedInstruction: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[i];

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
