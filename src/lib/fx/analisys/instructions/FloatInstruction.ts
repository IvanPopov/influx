import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { SCOPE, T_FLOAT } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";

export interface IFloatInstructionSettings extends IInstructionSettings {
    value: string;
}

export class FloatInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    protected _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, scope, ...settings }: IFloatInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FloatExpr, 
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
