import { StmtInstruction } from "./StmtInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";
import { isNull } from "./../../common";
import { IStmtInstruction, EInstructionTypes, IExprInstruction, IIfStmtInstruction } from "./../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


export interface IIfStmtInstructionSettings extends IInstructionSettings {
    cond: IExprInstruction;
    conseq: IStmtInstruction;
    contrary?: IStmtInstruction;
}


/**
 * Represent if(expr) stmt or if(expr) stmt else stmt
 * ( if || if_else ) Expr Stmt [Stmt]
 */
export class IfStmtInstruction extends StmtInstruction implements IIfStmtInstruction {
    protected _cond: IExprInstruction;
    protected _conseq: IStmtInstruction;
    protected _contrary: IStmtInstruction;

    
    constructor({ cond, conseq, contrary = null, ...settings }: IIfStmtInstructionSettings) {

        super({ instrType: EInstructionTypes.k_IfStmtInstruction, ...settings });

        this._cond = Instruction.$withParent(cond, this);
        this._conseq = Instruction.$withParent(conseq, this);
        this._contrary = Instruction.$withParent(contrary, this);
    }


    get cond(): IExprInstruction {
        return this._cond;
    }


    get conseq(): IStmtInstruction {
        return this._conseq;
    }


    get contrary(): IStmtInstruction {
        return this._contrary;
    }


    toCode(): string {
        var code: string = "";
        if (isNull(this._contrary)) {
            code += "if(";
            code += this._cond.toCode() + ")";
            code += this._conseq.toCode();
        }
        else {
            code += "if(";
            code += this._cond.toCode() + ") ";
            code += this._conseq.toCode();
            code += "else ";
            code += this._contrary.toCode();
        }

        return code;
    }
}

