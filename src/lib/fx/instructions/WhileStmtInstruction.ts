import { EInstructionTypes, IExprInstruction, IStmtInstruction, IWhileStmtInstruction, IDoWhileOperator } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";



export interface IWhileStmtInstructionSettings extends IInstructionSettings {
    cond: IExprInstruction;
    body: IStmtInstruction;
    operator: IDoWhileOperator;
}


/**
 * Represent while(expr) stmt
 * ( while || do_while) ExprInstruction StmtInstruction
 */
export class WhileStmtInstruction extends StmtInstruction implements IWhileStmtInstruction {
    protected _operator: IDoWhileOperator;
    protected _cond: IExprInstruction;
    protected _body: IStmtInstruction;

    
    constructor({ cond, body, operator, ...settings }: IWhileStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_WhileStmtInstruction, ...settings });
        
        this._cond = Instruction.$withParent(cond, this);
        this._body = Instruction.$withParent(body, this);
        this._operator = operator;
    }


    get cond(): IExprInstruction {
        return this.cond;
    }


    get body(): IStmtInstruction {
        return this._body;
    }


    get operator(): IDoWhileOperator {
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
