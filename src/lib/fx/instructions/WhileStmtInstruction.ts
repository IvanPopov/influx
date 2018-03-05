import { EInstructionTypes } from "../../idl/IInstruction";
import { IStmtInstruction } from "./../../idl/IInstruction";
import { IExprInstruction } from "./../../idl/IInstruction";
import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent while(expr) stmt
 * ( while || do_while) ExprInstruction StmtInstruction
 */
export class WhileStmtInstruction extends StmtInstruction {
    protected _operator: string;
    protected _cond: IExprInstruction;
    protected _body: IStmtInstruction;

    
    constructor(node: IParseNode, cond: IExprInstruction, body: IStmtInstruction, operator: string) {
        super(node, EInstructionTypes.k_WhileStmtInstruction);
        this._cond = cond;
        this._body = body;
        this._operator = operator;
    }


    get cond(): IExprInstruction {
        return this.cond;
    }


    get body(): IStmtInstruction {
        return this._body;
    }


    get operator(): string {
        return this._operator;
    }


    toCode(): string {
        var code: string = "";
        if (this.operator === "while") {
            code += "while(";
            code += this.cond.toCode();
            code += ")";
            code += this.body.toCode();
        }
        else {
            code += "do";
            code += this.body.toCode();
            code += "while(";
            code += this.cond.toCode();
            code += ");";
        }
        return code;
    }
}
