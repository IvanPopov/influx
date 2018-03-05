import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, ITypeInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";

/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction {
    private _srcExpr: IInstruction;

    constructor(node: IParseNode, type: ITypeInstruction, expr: IInstruction) {
        super(node, type, EInstructionTypes.k_CastExprInstruction);

        this._srcExpr = expr;
    }

    get expr(): IInstruction {
        return this._srcExpr;
    }

    toCode(): string {
        var code: string = "";
        code += this.type.toCode();
        code += "(";
        code += this._srcExpr.toCode();
        code += ")";
        return code;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this._srcExpr;
        pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    isConst(): boolean {
        return (<IExprInstruction>this._srcExpr).isConst();
    }
}
