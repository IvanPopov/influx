import { EInstructionTypes, IInstruction } from "@lib/idl/IInstruction";

export namespace instruction {
    export const UNDEFINE_LENGTH: number = 0xffffff;
    export const UNDEFINE_SIZE: number = 0xffffff;
    export const UNDEFINE_PADDING: number = 0xffffff;
    export const UNDEFINE_NAME: string = "undef";

    export function isExpression(instr: IInstruction): boolean {
        switch (instr.instructionType) {
            case EInstructionTypes.k_ConditionalExpr:
            case EInstructionTypes.k_ConstructorCallExpr:
            case EInstructionTypes.k_AssignmentExpr:
            case EInstructionTypes.k_ArithmeticExpr:
            case EInstructionTypes.k_InitExpr:
            case EInstructionTypes.k_IdExpr:
            case EInstructionTypes.k_FunctionCallExpr:
            case EInstructionTypes.k_FloatExpr:
            case EInstructionTypes.k_IntExpr:
            case EInstructionTypes.k_BoolExpr:
            case EInstructionTypes.k_PostfixArithmeticExpr:
            case EInstructionTypes.k_PostfixIndexExpr:
            case EInstructionTypes.k_PostfixPointExpr:
            case EInstructionTypes.k_ComplexExpr:
            case EInstructionTypes.k_CastExpr:
            case EInstructionTypes.k_UnaryExpr:
                // todo: add other types!!!
                return true;
        }

        return false;
    }


    export function isStatement(instr: IInstruction): boolean {
        switch (instr.instructionType) {
            case EInstructionTypes.k_Stmt:
            case EInstructionTypes.k_DeclStmt:
            case EInstructionTypes.k_ReturnStmt:
            case EInstructionTypes.k_IfStmt:
            case EInstructionTypes.k_StmtBlock:
            case EInstructionTypes.k_ExprStmt:
            case EInstructionTypes.k_WhileStmt:
            case EInstructionTypes.k_ForStmt:
            case EInstructionTypes.k_BreakStmt:
            case EInstructionTypes.k_SemicolonStmt:
                // todo: add other types!!!
                return true;
        }

        return false;
    }


    export function isLiteral(instr: IInstruction): boolean {
        switch (instr.instructionType) {
            case EInstructionTypes.k_IntExpr:
            case EInstructionTypes.k_FloatExpr:
            case EInstructionTypes.k_BoolExpr:
            case EInstructionTypes.k_StringExpr:
                return true;
        }

        return false;
    }
}