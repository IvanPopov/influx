import { isNull } from "@lib/common";
import { EAnalyzerErrors } from '@lib/idl/EAnalyzerErrors';
import { ECheckStage, EInstructionTypes, IExprInstruction, IForStmtInstruction, IStmtInstruction, ITypedInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";
import { StmtInstruction } from "./StmtInstruction";

export interface IForStmtInstructionSettings extends IInstructionSettings {
    init?: ITypedInstruction;
    cond?: IExprInstruction;
    step?: IExprInstruction;
    body?: IStmtInstruction;
}


/**
 * Represent for(forInit forCond ForStep) stmt
 * for ExprInstruction or VarDeclInstruction ExprInstruction ExprInstruction StmtInstruction
 */
export class ForStmtInstruction extends StmtInstruction implements IForStmtInstruction {
    protected _init: ITypedInstruction;
    protected _cond: IExprInstruction;
    protected _step: IExprInstruction;
    protected _body: IStmtInstruction;

    constructor({ init = null, cond = null, step = null, body = null, ...settings }: IForStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ForStmt, ...settings });

        this._init = Instruction.$withParent(init, this);
        this._cond = Instruction.$withParent(cond, this);
        this._step = Instruction.$withParent(step, this);
        this._body = Instruction.$withParent(body, this);
    }


    get init(): ITypedInstruction {
        return this._init;
    }


    get cond(): IExprInstruction {
        return this._cond;
    }


    get step(): IExprInstruction {
        return this._step;
    }


    get body(): IStmtInstruction {
        return this._body;
    }

    toCode(): string {
        var code: string = "for(";

        code += this._init.toCode() + ";";
        code += this._cond.toCode() + ";";
        code += this._step.toCode() + ")";
        code += this._body.toCode();

        return code;
    }

    // TODO: move it to Analysis.ts
    check(stage: ECheckStage, info: any = null): boolean {
        if (isNull(this._step)) {
            this._setError(EAnalyzerErrors.InvalidForStepEmpty);
            return false;
        }

        if (isNull(this._init)) {
            this._setError(EAnalyzerErrors.InvalidForInitEmptyIterator);
            return false;
        }

        if (this._init.instructionType !== EInstructionTypes.k_VariableDecl) {
            this._setError(EAnalyzerErrors.InvalidForInitExpr);
            return false;
        }

        if (isNull(this._cond)) {
            this._setError(EAnalyzerErrors.InvalidForConditionEmpty);
            return false;
        }

        if (this._cond.instructionType !== EInstructionTypes.k_RelationalExpr) {
            this._setError(EAnalyzerErrors.InvalidForConditionRelation);
            return false;
        }

        if (this._step.instructionType === EInstructionTypes.k_UnaryExpr ||
            this._step.instructionType === EInstructionTypes.k_AssignmentExpr ||
            this._step.instructionType === EInstructionTypes.k_PostfixArithmeticExpr) {
            
            // todo: rewrite this check!!
            // var sOperator: string = this._step.operator;
            // if (sOperator !== "++" && sOperator !== "--" &&
            //     sOperator !== "+=" && sOperator !== "-=") {
            //     this._setError(EAnalyzerErrors.BAD_FOR_STEP_OPERATOR, { operator: sOperator });
            //     return false;
            // }
        }
        else {
            this._setError(EAnalyzerErrors.InvalidForStepExpr);
            return false;
        }

        return true;
    }
}
