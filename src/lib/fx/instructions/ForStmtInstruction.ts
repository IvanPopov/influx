import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, ECheckStage, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IVariableDeclInstruction, IStmtInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { EEffectErrors } from "../../idl/EEffectErrors";
import { IParseNode } from "../../idl/parser/IParser";

/**
 * Represent for(forInit forCond ForStep) stmt
 * for ExprInstruction or VarDeclInstruction ExprInstruction ExprInstruction StmtInstruction
 */
export class ForStmtInstruction extends StmtInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ForStmtInstruction);
    }

    toCode(): string {
        var sCode: string = "for(";

        sCode += this.instructions[0].toCode() + ";";
        sCode += this.instructions[1].toCode() + ";";
        sCode += this.instructions[2].toCode() + ")";
        sCode += this.instructions[3].toCode();

        return sCode;
    }

    check(eStage: ECheckStage, pInfo: any = null): boolean {
        var pInstructionList: IInstruction[] = this.instructions;

        if (this.instructions.length !== 4) {
            this._setError(EEffectErrors.BAD_FOR_STEP_EMPTY);
            return false;
        }

        if (isNull(pInstructionList[0])) {
            this._setError(EEffectErrors.BAD_FOR_INIT_EMPTY_ITERATOR);
            return false;
        }

        if (pInstructionList[0].instructionType !== EInstructionTypes.k_VariableDeclInstruction) {
            this._setError(EEffectErrors.BAD_FOR_INIT_EXPR);
            return false;
        }

        if (isNull(pInstructionList[1])) {
            this._setError(EEffectErrors.BAD_FOR_COND_EMPTY);
            return false;
        }

        if (pInstructionList[1].instructionType !== EInstructionTypes.k_RelationalExprInstruction) {
            this._setError(EEffectErrors.BAD_FOR_COND_RELATION);
            return false;
        }

        if (pInstructionList[2].instructionType === EInstructionTypes.k_UnaryExprInstruction ||
            pInstructionList[2].instructionType === EInstructionTypes.k_AssignmentExprInstruction ||
            pInstructionList[2].instructionType === EInstructionTypes.k_PostfixArithmeticInstruction) {

            var sOperator: string = pInstructionList[2].operator;
            if (sOperator !== "++" && sOperator !== "--" &&
                sOperator !== "+=" && sOperator !== "-=") {
                this._setError(EEffectErrors.BAD_FOR_STEP_OPERATOR, { operator: sOperator });
                return false;
            }
        }
        else {
            this._setError(EEffectErrors.BAD_FOR_STEP_EXPRESSION);
            return false;
        }

        return true;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pForInit: IVariableDeclInstruction = <IVariableDeclInstruction>this.instructions[0];
        var pForCondition: IExprInstruction = <IExprInstruction>this.instructions[1];
        var pForStep: IExprInstruction = <IExprInstruction>this.instructions[2];
        var pForStmt: IStmtInstruction = <IStmtInstruction>this.instructions[3];

        var pIteratorType: IVariableTypeInstruction = pForInit.type;

        pUsedDataCollector[pIteratorType.instructionID] = <ITypeUseInfoContainer>{
            type: pIteratorType,
            isRead: false,
            isWrite: true,
            numRead: 0,
            numWrite: 1,
            numUsed: 1
        };

        pForCondition.addUsedData(pUsedDataCollector, eUsedMode);
        pForStep.addUsedData(pUsedDataCollector, eUsedMode);
        pForStmt.addUsedData(pUsedDataCollector, eUsedMode);
    }
}
