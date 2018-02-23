import { EAFXInstructionTypes, EVarUsedMode, IAFXExprInstruction, IAFXTypeUseInfoContainer } from '../../idl/IAFXInstruction';
import { IMap } from '../../idl/IMap';
import { ExprInstruction } from './ExprInstruction';
import { IParseNode } from '../../idl/parser/IParser';

/**
 * Represent + - ! ++ -- expr
 * (+|-|!|++|--|) Instruction
 */
export class UnaryExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_UnaryExprInstruction;
    }

    toCode(): string {
        var sCode: string = '';
        sCode += this.operator;
        sCode += this.instructions[0].toCode();

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
                 eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        if (this.operator === '++' || this.operator === '--') {
            (<IAFXExprInstruction>this.instructions[0]).addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
        } else {
            (<IAFXExprInstruction>this.instructions[0]).addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        }
    }

    isConst(): boolean {
        return (<IAFXExprInstruction>this.instructions[0]).isConst();
    }

    evaluate(): boolean {
        var sOperator: string = this.operator;
        var pExpr: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[0];

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
