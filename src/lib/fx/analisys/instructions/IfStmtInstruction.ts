import { isNull } from "@lib/common";
import { EInstructionTypes, IAttributeInstruction, IExprInstruction, IIfStmtInstruction, IStmtInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";

export interface IIfStmtInstructionSettings extends IInstructionSettings {
    cond: IExprInstruction;
    conseq: IStmtInstruction;
    contrary?: IStmtInstruction;
    attributes?: IAttributeInstruction[];
}


/**
 * Represent if(expr) stmt or if(expr) stmt else stmt
 * ( if || if_else ) Expr Stmt [Stmt]
 */
export class IfStmtInstruction extends StmtInstruction implements IIfStmtInstruction {
    readonly cond: IExprInstruction;
    readonly conseq: IStmtInstruction;
    readonly contrary: IStmtInstruction;
    readonly attributes: IAttributeInstruction[];
    
    constructor({ cond, conseq, attributes = null, contrary = null, ...settings }: IIfStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IfStmt, ...settings });

        this.cond = Instruction.$withParent(cond, this);
        this.conseq = Instruction.$withParent(conseq, this);
        this.contrary = Instruction.$withParent(contrary, this);
        this.attributes = (attributes || []).map(attr => Instruction.$withParent(attr, this));
    }




    toCode(): string {
        var code: string = "";
        if (isNull(this.contrary)) {
            code += "if(";
            code += this.cond.toCode() + ")";
            code += this.conseq.toCode();
        }
        else {
            code += "if(";
            code += this.cond.toCode() + ") ";
            code += this.conseq.toCode();
            code += "else ";
            code += this.contrary.toCode();
        }

        return code;
    }
}

