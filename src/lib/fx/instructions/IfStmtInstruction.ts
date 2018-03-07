import { StmtInstruction } from "./StmtInstruction";
import { IInstructionSettings } from "./Instruction";
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
    protected _ifStmt: IStmtInstruction;
    protected _elseStmt: IStmtInstruction;

    
    constructor({ cond, conseq, contrary = null, ...settings }: IIfStmtInstructionSettings) {

        super({ instrType: EInstructionTypes.k_IfStmtInstruction, ...settings });

        this._cond = cond;
        this._ifStmt = conseq;
        this._elseStmt = contrary;
    }


    get cond(): IExprInstruction {
        return this._cond;
    }


    get ifStmt(): IStmtInstruction {
        return this._ifStmt;
    }


    get elseStmt(): IStmtInstruction {
        return this._elseStmt;
    }


    toCode(): string {
        var code: string = "";
        if (isNull(this._elseStmt)) {
            code += "if(";
            code += this._cond.toCode() + ")";
            code += this._ifStmt.toCode();
        }
        else {
            code += "if(";
            code += this._cond.toCode() + ") ";
            code += this._ifStmt.toCode();
            code += "else ";
            code += this._elseStmt.toCode();
        }

        return code;
    }
}

