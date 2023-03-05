import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { T_NULL } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";


export class NullInstruction extends ExprInstruction implements ILiteralInstruction<number> {

    constructor({ scope, ...settings }: IInstructionSettings) {
        super({ instrType: EInstructionTypes.k_NullExpr, type: T_NULL, scope, ...settings });
    }

    get value(): number {
        return null;
    }

    toString(): string {
        return `NULL`;
    }

    
    toCode(): string {
        return this.toString();
    }


    isConst(): boolean {
        return true;
    }
}

