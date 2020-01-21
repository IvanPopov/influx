import { assert, isNull } from "@lib/common";
import { EInstructionTypes, IAssignmentExprInstruction, IComplexExprInstruction, IExprInstruction, IIdExprInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

export namespace expression {
    /**
     * unwind operation returns declaration in case of correct l-value expression;
     */
    export function unwind(expr: IExprInstruction): IVariableDeclInstruction {
        if (isNull(expr)) {
            return null;
        }

        switch (expr.instructionType) {
            case EInstructionTypes.k_PostfixPointExpr:
                return unwind((<IPostfixPointInstruction>expr).element);
            case EInstructionTypes.k_PostfixIndexExpr:
                return unwind((<IPostfixIndexInstruction>expr).element);
            case EInstructionTypes.k_IdExpr:
                return (<IIdExprInstruction>expr).decl;
            case EInstructionTypes.k_BitwiseExpr:
            case EInstructionTypes.k_ArithmeticExpr:
                // arithmetic expression returns right-hand value;
                return null;
            case EInstructionTypes.k_InitExpr:
                assert(false, 'init expression doesn\'t support unwind operation');
                return null;
            case EInstructionTypes.k_AssignmentExpr:
                // todo: reseach how it work in HLSL
                //// assigment expression returns right-hand value;
                return unwind((<IAssignmentExprInstruction>expr).left);
            case EInstructionTypes.k_CastExpr:
                // cast expression returns right-hand value;
                return null;
            case EInstructionTypes.k_UnaryExpr:
                // unary expression returns right-hand value;
                return null;
            case EInstructionTypes.k_RelationalExpr:
                // relation expression returns right-hand value;
                return null;
            case EInstructionTypes.k_ConstructorCallExpr:
                // ctor call expression is not allowed as l-value;
                // todo: allow it?
                return null;
            case EInstructionTypes.k_ComplexExpr:
                return unwind((<IComplexExprInstruction>expr).expr);
            case EInstructionTypes.k_IntExpr:
            case EInstructionTypes.k_FloatExpr:
            case EInstructionTypes.k_StringExpr:
            case EInstructionTypes.k_BoolExpr:
                // literal cannot be a left-hand value;
                return null;
            case EInstructionTypes.k_FunctionCallExpr:
                // function call expression returns right-hand value;
                return null;
            default:
                assert(false, "unsupported expr found");
                return null;
        }
    }
}
