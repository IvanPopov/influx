import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, ECheckStage, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IStmtInstruction, IVariableTypeInstruction, ITypedInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { EEffectErrors } from "../../idl/EEffectErrors";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";


export interface IForStmtInstructionSettings extends IInstructionSettings {
    init?: IExprInstruction;
    cond?: IExprInstruction;
    step?: IExprInstruction;
    body?: IStmtInstruction;
}


/**
 * Represent for(forInit forCond ForStep) stmt
 * for ExprInstruction or VarDeclInstruction ExprInstruction ExprInstruction StmtInstruction
 */
export class ForStmtInstruction extends StmtInstruction {
    protected _init: IExprInstruction;
    protected _cond: IExprInstruction;
    protected _step: IExprInstruction;
    protected _body: IStmtInstruction;

    constructor({ init = null, cond = null, step = null, body = null, ...settings }: IForStmtInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ForStmtInstruction, ...settings });

        this._init = Instruction.$withParent(init, this);
        this._cond = Instruction.$withParent(cond, this);
        this._step = Instruction.$withParent(step, this);
        this._body = Instruction.$withParent(body, this);
    }


    get init(): IExprInstruction {
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

    check(stage: ECheckStage, info: any = null): boolean {
        if (isNull(this._step)) {
            this._setError(EEffectErrors.BAD_FOR_STEP_EMPTY);
            return false;
        }

        if (isNull(this._init)) {
            this._setError(EEffectErrors.BAD_FOR_INIT_EMPTY_ITERATOR);
            return false;
        }

        if (this._init.instructionType !== EInstructionTypes.k_VariableDeclInstruction) {
            this._setError(EEffectErrors.BAD_FOR_INIT_EXPR);
            return false;
        }

        if (isNull(this._cond)) {
            this._setError(EEffectErrors.BAD_FOR_COND_EMPTY);
            return false;
        }

        if (this._cond.instructionType !== EInstructionTypes.k_RelationalExprInstruction) {
            this._setError(EEffectErrors.BAD_FOR_COND_RELATION);
            return false;
        }

        if (this._step.instructionType === EInstructionTypes.k_UnaryExprInstruction ||
            this._step.instructionType === EInstructionTypes.k_AssignmentExprInstruction ||
            this._step.instructionType === EInstructionTypes.k_PostfixArithmeticInstruction) {
            
            // todo: rewrite this check!!
            // var sOperator: string = this._step.operator;
            // if (sOperator !== "++" && sOperator !== "--" &&
            //     sOperator !== "+=" && sOperator !== "-=") {
            //     this._setError(EEffectErrors.BAD_FOR_STEP_OPERATOR, { operator: sOperator });
            //     return false;
            // }
        }
        else {
            this._setError(EEffectErrors.BAD_FOR_STEP_EXPRESSION);
            return false;
        }

        return true;
    }

    addUsedData(usedDataCollector: IMap<ITypeUseInfoContainer>,
        usedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var forInit: IExprInstruction = <IExprInstruction>this._init;
        var forCondition: IExprInstruction = <IExprInstruction>this._cond;
        var forStep: IExprInstruction = <IExprInstruction>this._step;
        var forStmt: IStmtInstruction = <IStmtInstruction>this._body;

        var pIteratorType: IVariableTypeInstruction = forInit.type;

        usedDataCollector[pIteratorType.instructionID] = <ITypeUseInfoContainer>{
            type: pIteratorType,
            isRead: false,
            isWrite: true,
            numRead: 0,
            numWrite: 1,
            numUsed: 1
        };

        forCondition.addUsedData(usedDataCollector, usedMode);
        forStep.addUsedData(usedDataCollector, usedMode);
        forStmt.addUsedData(usedDataCollector, usedMode);
    }
}
