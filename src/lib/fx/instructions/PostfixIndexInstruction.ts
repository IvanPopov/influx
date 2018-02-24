import { ExprInstruction } from "./ExprInstruction";
import { IVariableDeclInstruction, EInstructionTypes, IExprInstruction, EVarUsedMode, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent someExpr[someIndex]
 * EMPTY_OPERATOR Instruction ExprInstruction
 */
export class PostfixIndexInstruction extends ExprInstruction {
    private _pSamplerArrayDecl: IVariableDeclInstruction = null;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_PostfixIndexInstruction);
    }

    toCode(): string {
        var sCode: string = "";

        {
            sCode += this.instructions[0].toCode();

            if (!(<IExprInstruction>this.instructions[0]).type.collapsed) {
                sCode += "[" + this.instructions[1].toCode() + "]";
            }
        }

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.instructions[0];
        var pIndex: IExprInstruction = <IExprInstruction>this.instructions[1];

        pSubExpr.addUsedData(pUsedDataCollector, eUsedMode);
        pIndex.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);

        if (pSubExpr.type.isFromVariableDecl() && pSubExpr.type.isSampler()) {
            this._pSamplerArrayDecl = pSubExpr.type.parentVarDecl;
        }
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst() &&
            (<IExprInstruction>this.instructions[1]).isConst();
    }
}


