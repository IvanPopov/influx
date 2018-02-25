import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent (expr)
 * EMPTY_OPERATOR ExprInstruction
 */
export class ComplexExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ComplexExprInstruction);
    }

    toCode(): string {
        var sCode: string = "";
        sCode += "(" + this.instructions[0].toCode() + ")";
        return sCode;
    }

    
    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst();
    }


    evaluate(): boolean {
        if ((<IExprInstruction>this.instructions[0]).evaluate()) {
            this._pLastEvalResult = (<IExprInstruction>this.instructions[0]).getEvalValue();
            return true;
        } else {
            return false;
        }
    }
}
