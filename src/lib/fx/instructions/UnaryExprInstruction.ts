import { EInstructionTypes, EVarUsedMode, IExprInstruction, ITypeUseInfoContainer } from '../../idl/IInstruction';
import { IMap } from '../../idl/IMap';
import { ExprInstruction, IExprInstructionSettings } from './ExprInstruction';
import { IParseNode } from '../../idl/parser/IParser';
import * as Analyzer from '../Analyzer';
import { IInstructionSettings, Instruction } from './Instruction';


export type UnaryOperator = "+" | "-" | "!" | "++" | "--";


export interface IUnaryExprInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
    operator: UnaryOperator;
}


/**
 * Represent + - ! ++ -- expr
 * (+|-|!|++|--|) Instruction
 */
export class UnaryExprInstruction extends ExprInstruction {
    protected _operator: UnaryOperator;
    protected _expr: IExprInstruction;


    constructor({ expr, operator, ...settings }: IUnaryExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_UnaryExprInstruction, type: expr.type, ...settings });
        
        this._expr = Instruction.$withParent(expr, this);
        this._operator = operator;
    }


    get operator(): string {
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


    evaluate(): boolean {
        var sOperator: string = this.operator;
        var pExpr: IExprInstruction = <IExprInstruction>this.expr;

        if (!pExpr.evaluate()) {
            return false;
        }

        var pRes: any = null;

        try {
            pRes = pExpr.getEvalValue();
            switch (sOperator) {
                case '+':
                    pRes = +pRes;
                    break;
                case '-':
                    pRes = -pRes;
                    break;
                case '!':
                    pRes = !pRes;
                    break;
                case '++':
                    pRes = ++pRes;
                    break;
                case '--':
                    pRes = --pRes;
                    break;
            }
        } catch (e) {
            return false;
        }

        this._evalResult = pRes;
        return true;
    }
}
