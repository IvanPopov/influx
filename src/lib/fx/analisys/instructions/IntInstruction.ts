import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { T_INT, SCOPE } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";

export interface IIntInstructionSettings extends IInstructionSettings {
    value: string;
    signed?: boolean;
}

export class IntInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    readonly value: number;
    // readonly signed: boolean;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, signed = true, scope, ...settings }: IIntInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IntExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes 
            type: VariableTypeInstruction.wrapAsConst(T_INT, SCOPE), scope, ...settings });

        this.value = ((<number><any>value) * 1);
        // this.signed = signed;

        // if (!signed) {
        //     this.value >>>= 0;
        // }
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

