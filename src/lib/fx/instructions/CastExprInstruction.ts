import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, ITypeInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import { Instruction } from "./Instruction";


export interface ICastExprInstructionSettings extends IExprInstructionSettings {
    sourceExpr: IExprInstruction;
}


/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction {
    private _srcExpr: IExprInstruction;

    constructor({ sourceExpr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExprInstruction, ...settings });

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

    IsUseless() {
        return this.type.isEqual(this.expr.type);
    }

    isConst(): boolean {
        return (<IExprInstruction>this._srcExpr).isConst();
    }
}
