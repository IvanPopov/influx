import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";

export type BreakOperator = "break" | "discard";

export interface IBreakStmtInstructionSettings extends IInstructionSettings {
    operator?: BreakOperator;
}

/**
 * Reprsernt continue; break; discard;
 * (continue || break || discard) 
 */
export class BreakStmtInstruction extends StmtInstruction {
    protected _operator: BreakOperator;

    constructor({ operator = "break", ...settings }: IBreakStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_BreakStmtInstruction, ...settings });
        this._operator = operator;
    }

    get operator(): string {
        return this._operator;
    }

    // todo: validate operator's name
    toCode(): string {
        console.assert(this.operator == "break");
        return this.operator + ";";
    }
}
