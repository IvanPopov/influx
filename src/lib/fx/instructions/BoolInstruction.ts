import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { T_BOOL, SCOPE } from "@lib/fx/SystemScope";
import { ExprInstruction } from "@lib/fx/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/instructions/VariableTypeInstruction";

export interface IBoolInstructionSettings extends IInstructionSettings {
    value: "true" | "false";
}

export class BoolInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: boolean;

    constructor({ value, scope, ...settings }: IBoolInstructionSettings) {
        super({ instrType: EInstructionTypes.k_BoolInstruction, 
            // NOTE: type wraping is no really necessary, just for debug purposes
            type: VariableTypeInstruction.wrapAsConst(T_BOOL, SCOPE), scope, ...settings });

        this._value = (value === "true");
    }

    set value(bValue: boolean) {
        this._value = bValue;
    }

    get value(): boolean {
        return this._value;
    }

    toString(): string {
        return String(this._value);
    }

    toCode(): string {
        return this._value ? "true" : "false";
    }

    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }

    isConst(): boolean {
        return true;
    }
}

