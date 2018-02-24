import { EInstructionTypes, EVarUsedMode, IExprInstruction, ITypeUseInfoContainer } from '../../idl/IInstruction';
import { IMap } from '../../idl/IMap';
import { ExprInstruction } from './ExprInstruction';
import { IParseNode } from '../../idl/parser/IParser';

/**
 * Represent + - ! ++ -- expr
 * (+|-|!|++|--|) Instruction
 */
export class UnaryExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_UnaryExprInstruction);
    }

    toCode(): string {
        var sCode: string = '';
        sCode += this.operator;
        sCode += this.instructions[0].toCode();

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
                 eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (this.operator === '++' || this.operator === '--') {
            (<IExprInstruction>this.instructions[0]).addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
        } else {
            (<IExprInstruction>this.instructions[0]).addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        }
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst();
    }

    evaluate(): boolean {
        var sOperator: string = this.operator;
        var pExpr: IExprInstruction = <IExprInstruction>this.instructions[0];

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

        this._pLastEvalResult = pRes;

        return true;
    }
}
