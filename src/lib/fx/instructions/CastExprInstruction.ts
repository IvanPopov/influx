import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, ITypeInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import { Instruction } from "./Instruction";


export interface ICastExprInstructionSettings extends IExprInstructionSettings {
    sourceExpr: IInstruction;
}


/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction {
    private _srcExpr: IInstruction;

    constructor({ sourceExpr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExprInstruction, ...settings });

        this._srcExpr = Instruction.$withParent(sourceExpr, this);
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


    isConst(): boolean {
        return (<IExprInstruction>this._srcExpr).isConst();
    }
}
