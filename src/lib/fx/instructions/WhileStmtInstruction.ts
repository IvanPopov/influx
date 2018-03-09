import { EInstructionTypes } from "../../idl/IInstruction";
import { IInstructionSettings } from "./Instruction";
import { IStmtInstruction } from "./../../idl/IInstruction";
import { IExprInstruction } from "./../../idl/IInstruction";
import { StmtInstruction } from "./StmtInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export type DoWhileOperator = "do" | "while";

export interface IWhileStmtInstructionSettings extends IInstructionSettings {
    cond: IExprInstruction;
    body: IStmtInstruction;
    operator: DoWhileOperator;
}


/**
 * Represent while(expr) stmt
 * ( while || do_while) ExprInstruction StmtInstruction
 */
export class WhileStmtInstruction extends StmtInstruction {
    protected _operator: DoWhileOperator;
    protected _cond: IExprInstruction;
    protected _body: IStmtInstruction;

    
    constructor({ cond, body, operator, ...settings }) {
        super({ instrType: EInstructionTypes.k_WhileStmtInstruction, ...settings });
        
        this._cond = cond.$withParent(this);
        this._body = body.$withParent(this);
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
        var code: string = '';
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
