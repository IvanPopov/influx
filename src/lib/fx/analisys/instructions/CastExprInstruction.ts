import { types } from '@lib/fx/analisys/helpers';
import { EInstructionTypes, ICastExprInstruction, IExprInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface ICastExprInstructionSettings extends IExprInstructionSettings {
    sourceExpr: IExprInstruction;
}


/**
 * Represent (type) expr
 * EMPTY_OPERATOR VariableTypeInstruction Instruction
 */
export class CastExprInstruction extends ExprInstruction implements ICastExprInstruction {
    readonly expr: IExprInstruction;

    constructor({ sourceExpr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExpr, ...settings });
        this.expr = Instruction.$withParent(sourceExpr, this);
    }

    toCode(): string {
        return `(${this.type.toCode()})${this.expr.toCode()}`;
    }

    /** @deprecated */
    isUseless() {
        return types.equals(this.type, this.expr.type);
    }
    

    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }
}
