import { EInstructionTypes, EVarUsedMode, ICastExprInstruction, IExprInstruction, IInstruction, ITypeInstruction, ITypeUseInfoContainer } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { IParseNode } from "@lib/idl/parser/IParser";

import { IExprInstructionSettings } from "./ExprInstruction";
import { ExprInstruction } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface ICastExprInstructionSettings extends IExprInstructionSettings {
    sourceExpr: IExprInstruction;
}


/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction implements ICastExprInstruction {
    private _srcExpr: IExprInstruction;

    constructor({ sourceExpr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExpr, ...settings });

        this._srcExpr = Instruction.$withParent(sourceExpr, this);
    }

    get expr(): IExprInstruction {
        return this._srcExpr;
    }

    toCode(): string {
        var code: string = "";
        code += "(";
        code += this.type.toCode();
        code += ")";
        code += this._srcExpr.toCode();
        return code;
    }

    isUseless() {
        return this.type.isEqual(this.expr.type);
    }

    isConst(): boolean {
        return (<IExprInstruction>this._srcExpr).isConst();
    }
}
