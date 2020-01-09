import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { T_INT, T_UINT, SCOPE } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";

export interface IIntInstructionSettings extends IInstructionSettings {
    value: number;
    signed: boolean;
}

export class IntInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    readonly value: number;
    readonly signed: boolean;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, signed, scope, ...settings }: IIntInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IntExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes 
            type: VariableTypeInstruction.wrapAsConst(signed ? T_INT : T_UINT, SCOPE), scope, ...settings });

        this.value = value;
        this.signed = signed;

        if (!signed) {
            this.value >>>= 0;
        }
    }

    

    toString(): string {
        // return `${this.value}${this.signed? '' : 'u'}`;
        return `${this.value}`;
    }

    
    toCode(): string {
        return this.toString();
    }

    
    evaluate(): boolean {
        this._evalResult = this.value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}

