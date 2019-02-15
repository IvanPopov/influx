import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { EInstructionTypes, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


export interface IComplexExprInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
}


/**
 * Represent (expr)
 * EMPTY_OPERATOR ExprInstruction
 */
export class ComplexExprInstruction extends ExprInstruction {
    protected _expr: IExprInstruction;


    constructor({ expr, ...settings }: IComplexExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ComplexExprInstruction, type: expr.type, ...settings });

        this._expr = Instruction.$withParent(expr, this);
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
