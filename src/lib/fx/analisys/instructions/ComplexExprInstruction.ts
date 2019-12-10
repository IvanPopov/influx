import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings, Instruction } from "@lib/fx/analisys/instructions/Instruction";
import { EInstructionTypes, IComplexExprInstruction, IExprInstruction } from "@lib/idl/IInstruction";

export interface IComplexExprInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
}


/**
 * Represent (expr)
 * EMPTY_OPERATOR ExprInstruction
 */
export class ComplexExprInstruction extends ExprInstruction implements IComplexExprInstruction {
    protected _expr: IExprInstruction;


    constructor({ expr, ...settings }: IComplexExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ComplexExpr, type: expr.type, ...settings });

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
