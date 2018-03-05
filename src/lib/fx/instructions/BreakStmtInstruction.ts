import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Reprsernt continue; break; discard;
 * (continue || break || discard) 
 */
export class BreakStmtInstruction extends StmtInstruction {
    private _operator: string;

    constructor(node: IParseNode, operator: string) {
        super(node, EInstructionTypes.k_BreakStmtInstruction);
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
