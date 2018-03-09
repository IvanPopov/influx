import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, ITypeInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";


export interface ICastExprInstructionSettings extends IExprInstructionSettings {
    sourceExr: IInstruction;
}


/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction {
    private _srcExpr: IInstruction;

    constructor({ sourceExr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExprInstruction, ...settings });

        this._srcExpr = sourceExr.$withParent(this);
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
