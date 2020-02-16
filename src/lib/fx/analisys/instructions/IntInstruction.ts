import { ExprInstruction } from "@lib/fx/analisys/instructions/ExprInstruction";
import { IInstructionSettings } from "@lib/fx/analisys/instructions/Instruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { SCOPE, T_INT, T_UINT } from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, ILiteralInstruction } from "@lib/idl/IInstruction";

export interface IIntInstructionSettings extends IInstructionSettings {
    signed: boolean;
    base: number;
    exp: number;
    heximal?: boolean;
}

export class IntInstruction extends ExprInstruction implements ILiteralInstruction<number> {
    readonly signed: boolean;
    readonly base: number;
    readonly exp: number;
    readonly heximal: boolean;


    constructor({ base, signed, exp, heximal = false, scope, ...settings }: IIntInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IntExpr, 
            // NOTE: type wraping is no really necessary, just for debug purposes 
            type: VariableTypeInstruction.wrapAsConst(signed ? T_INT : T_UINT, SCOPE), scope, ...settings });

        this.base = base;
        this.exp = exp;
        this.signed = signed;
        this.heximal = heximal;

        if (!signed) {
            this.base >>>= 0;
        }
    }

    get value(): number {
        return (this.base * Math.pow(10, this.exp));
    }

    toString(): string {
        return `${this.heximal ? '0x' : ''}${this.base.toString(this.heximal ? 16 : 10).toUpperCase()}${this.exp !== 0? `e${this.exp}`: ''}${this.signed? '': 'u'}`;
    }

    
    toCode(): string {
        return this.toString();
    }


    isConst(): boolean {
        return true;
    }
}

