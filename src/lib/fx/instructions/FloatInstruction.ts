import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { T_FLOAT, SCOPE } from "@lib/fx/SystemScope";
import { ExprInstruction } from "@lib/fx/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/instructions/VariableTypeInstruction";

export interface IFloatInstructionSettings extends IInstructionSettings {
    value: string;
}

export class FloatInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, scope, ...settings }: IFloatInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FloatInstruction, 
            // NOTE: type wraping is no really necessary, just for debug purposes
            type: VariableTypeInstruction.wrapAsConst(T_FLOAT, SCOPE), scope, ...settings });

        this._value = ((<number><any>value) * 1.0);
    }

    
    get value(): number {
        return this._value;
    }

    
    toString(): string {
        return String(this._value);
    }

    
    toCode(): string {
        var code: string = "";
        code += this._value.toString();
        if (this._value % 1 === 0) {
            code += ".";
        }
        return code;
    }

    
    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}
