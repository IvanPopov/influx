import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent (expr)
 * EMPTY_OPERATOR ExprInstruction
 */
export class ComplexExprInstruction extends ExprInstruction {
    private _expr: IExprInstruction;


    constructor(node: IParseNode, expr: IExprInstruction) {
        super(node, expr.type, EInstructionTypes.k_ComplexExprInstruction);

        this._expr = expr;
    }

    
    get expr(): IExprInstruction {
        return this._expr;
    }
    

    toCode(): string {
        return "(" + this.expr.toCode() + ")";
    }

    
    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }

    
    evaluate(): boolean {
        if ((<IExprInstruction>this.expr).evaluate()) {
            this._evalResult = (<IExprInstruction>this.expr).getEvalValue();
            return true;
        } else {
            return false;
        }
    }
}
