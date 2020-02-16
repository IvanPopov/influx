import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { SCOPE, T_FLOAT } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";

export interface IFloatInstructionSettings extends IInstructionSettings {
    value: number;
}

export class FloatInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    readonly value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, scope, ...settings }: IFloatInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FloatExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes
            type: VariableTypeInstruction.wrapAsConst(T_FLOAT, SCOPE), scope, ...settings });

        this.value = value;
    }

    
    toString(): string {
        return String(this.value);
    }

    
    toCode(): string {
        return `${this.value}${this.value % 1 === 0? '.': ''}`;
    }


    isConst(): boolean {
        return true;
    }
}
