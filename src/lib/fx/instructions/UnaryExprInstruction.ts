import { EInstructionTypes, EVarUsedMode, IExprInstruction, ITypeUseInfoContainer } from '../../idl/IInstruction';
import { IMap } from '../../idl/IMap';
import { ExprInstruction } from './ExprInstruction';
import { IParseNode } from '../../idl/parser/IParser';
import * as Effect from '../Effect';

/**
 * Represent + - ! ++ -- expr
 * (+|-|!|++|--|) Instruction
 */
export class UnaryExprInstruction extends ExprInstruction {
    protected _operator: string;
    protected _expr: IExprInstruction;


    constructor(pNode: IParseNode, expr: IExprInstruction, operator: string) {
        super(pNode, Effect.getSystemType('bool').variableType, EInstructionTypes.k_UnaryExprInstruction);
        this._expr = expr;
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

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
                 eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (this.operator === '++' || this.operator === '--') {
            (<IExprInstruction>this.expr).addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
        } else {
            (<IExprInstruction>this.expr).addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        }
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
