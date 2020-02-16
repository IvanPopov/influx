import { SCOPE, T_BOOL } from '@lib/fx/analisys/SystemScope';
import { EInstructionTypes, IExprInstruction, IUnaryExprInstruction, IUnaryOperator } from '@lib/idl/IInstruction';

import { ExprInstruction } from './ExprInstruction';
import { IInstructionSettings, Instruction } from './Instruction';
import { VariableTypeInstruction } from './VariableTypeInstruction';

export interface IUnaryExprInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
    operator: IUnaryOperator;
}


/**
 * Represent + - ! ++ -- expr
 * (+|-|!|++|--|) Instruction
 */
export class UnaryExprInstruction extends ExprInstruction implements IUnaryExprInstruction {
    protected _operator: IUnaryOperator;
    protected _expr: IExprInstruction;


    constructor({ expr, operator, ...settings }: IUnaryExprInstructionSettings) {
        super({
            instrType: EInstructionTypes.k_UnaryExpr,
            // NOTE: type wraping is no really necessary, just for debug purposes
            type: operator === '!'
                ? VariableTypeInstruction.wrapAsConst(T_BOOL, SCOPE)
                : expr.type,
            ...settings
        });

        this._expr = Instruction.$withParent(expr, this);
        this._operator = operator;
    }


    get operator(): IUnaryOperator {
        return this._operator;
    }


    get expr(): IExprInstruction {
        return this._expr;
    }


    toCode(): string {
        var sCode: string = '';
        sCode += this.operator;
        sCode += this.expr.toCode();

        return sCode;
    }

    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }
}
