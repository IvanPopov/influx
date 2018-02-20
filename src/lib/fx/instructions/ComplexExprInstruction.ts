import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent (expr)
 * EMPTY_OPERATOR ExprInstruction
 */
export class ComplexExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_ComplexExprInstruction;
    }

    _toFinalCode(): string {
        var sCode: string = "";

        sCode += "(" + this.instructions[0]._toFinalCode() + ")";

        return sCode;
    }

    isConst(): boolean {
        return (<IAFXExprInstruction>this.instructions[0]).isConst();
    }

    evaluate(): boolean {
        if ((<IAFXExprInstruction>this.instructions[0]).evaluate()) {
            this._pLastEvalResult = (<IAFXExprInstruction>this.instructions[0]).getEvalValue();
            return true;
        } else {
            return false;
        }
    }
}
