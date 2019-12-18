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
    readonly expr: IExprInstruction;

    constructor({ sourceExpr, ...settings }: ICastExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CastExpr, ...settings });
        this.expr = Instruction.$withParent(sourceExpr, this);
    }

    toCode(): string {
        return `(${this.type.toCode()})${this.expr.toCode}`;
    }

    
    isUseless() {
        return this.type.isEqual(this.expr.type);
    }
    

    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }
}
