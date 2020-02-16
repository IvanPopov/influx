import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { SCOPE, T_STRING } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";

export interface IStringInstructionSettings extends IInstructionSettings {
    value: string;
}


export class StringInstruction extends ExprInstruction implements ILiteralInstruction<string> {
    protected _value: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor({ value, scope, ...settings }: IStringInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StringExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes
            type: VariableTypeInstruction.wrapAsConst(T_STRING, SCOPE), scope, ...settings });
        
        this._value = value;
    }

    
    get value(): string {
        return this._value;
    }


    toString(): string {
        return this._value;
    }


    toCode(): string {
        return this._value;
    }
    

    isConst(): boolean {
        return true;
    }
}
