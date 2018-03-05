import { StmtInstruction } from "./StmtInstruction";
import { isNull } from "./../../common";
import { IStmtInstruction, EInstructionTypes, IExprInstruction, IIfStmtInstruction } from "./../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent if(expr) stmt or if(expr) stmt else stmt
 * ( if || if_else ) Expr Stmt [Stmt]
 */
export class IfStmtInstruction extends StmtInstruction implements IIfStmtInstruction {
    private _cond: IExprInstruction;
    private _ifStmt: IStmtInstruction;
    private _elseStmt: IStmtInstruction;

    
    constructor(node: IParseNode, cond: IExprInstruction, 
                ifStmt: IStmtInstruction, elseStmt: IStmtInstruction = null) {
        super(node, EInstructionTypes.k_IfStmtInstruction);

        this._cond = cond;
        this._ifStmt = ifStmt;
        this._elseStmt = elseStmt;
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

