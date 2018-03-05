import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, IStmtBlockInstruction, IStmtInstruction, IExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Represent {stmts}
 * EMPTY_OPERATOR StmtInstruction ... StmtInstruction
 */
export class StmtBlockInstruction extends StmtInstruction implements IStmtBlockInstruction {
    private _instructions: IStmtInstruction[];

    
    constructor(node: IParseNode, instructions: IStmtInstruction[]) {
        super(node, EInstructionTypes.k_StmtBlockInstruction);
        this._instructions = instructions;
    }


    get instructions(): IStmtInstruction[] {
        return this._instructions;
    }


    toCode(): string {
        var code: string = "{" + "\n";

        for (var i: number = 0; i < this.instructions.length; i++) {
            code += "\t" + this.instructions[i].toCode() + "\n";
        }

        code += "}";

        return code;
    }
}
