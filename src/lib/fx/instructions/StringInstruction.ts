import { ExprInstruction } from "@lib/fx/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/instructions/Instruction";
import { T_STRING, SCOPE } from "@lib/fx/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { VariableTypeInstruction } from "@lib/fx/instructions/VariableTypeInstruction";


export interface IStringInstructionSettings extends IInstructionSettings {
    value: string;
}


export class StringInstruction extends ExprInstruction implements ILiteralInstruction<string> {
    protected _value: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor({ value, scope, ...settings }: IStringInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StringInstruction, 
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


    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}
