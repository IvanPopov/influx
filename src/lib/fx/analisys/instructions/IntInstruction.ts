import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { T_INT, SCOPE } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";

export interface IIntInstructionSettings extends IInstructionSettings {
    value: string;
}

export class IntInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    protected _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, scope, ...settings }: IIntInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IntExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes 
            type: VariableTypeInstruction.wrapAsConst(T_INT, SCOPE), scope, ...settings });

        this._value = ((<number><any>value) * 1);
    }

    
    get value(): number {
        return this._value;
    }


    toString(): string {
        return <string><any>this._value;
    }

    
    toCode(): string {
        return this._value.toString();
    }

    
    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}

