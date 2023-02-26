import { assert, isNull } from "@lib/common";
import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, IComplexExprInstruction, IExprInstruction, IIdExprInstruction, IInstruction, ILiteralInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { instruction } from "./instruction";

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

    
    function evalVal(val: IInstruction) {
        if (!val) {
            return 0;
        }

        if (instruction.isLiteral(val)) {
            return (<ILiteralInstruction<number>>val).value;
        } 
            
        if (val.instructionType === EInstructionTypes.k_CastExpr) {
            return evalConst((<ICastExprInstruction>val).expr);
        }

        if (val.instructionType === EInstructionTypes.k_IdExpr) {
            const idExpr = (<IIdExprInstruction>val);
            if (idExpr.decl.isGlobal()) { // and is constant?
                console.assert(idExpr.decl.initExpr.instructionType !== EInstructionTypes.k_InitExpr);
                return evalConst(idExpr.decl.initExpr);
            }
        }
        
        console.error(`expr "${val.toCode()}" could not be evaluated`);
        return -1;
    }

    // simples possible evalator for minimal compartibility
    export function evalConst(expr: IExprInstruction): number
    {
        const val = evalVal(expr);
        if (val >= 0) {
            return val;
        }

        if (expr.instructionType !== EInstructionTypes.k_ArithmeticExpr) {
            console.error(`expr "${expr.toCode()}" could not be evaluated`);
            return -1;
        }

        const { left, right, operator } = <IArithmeticExprInstruction>expr;
        const lval = evalConst(left);
        const rval = evalConst(right);
        
        if (lval >= 0 && rval >= 0) {
            switch (operator) {
                // todo: use round ? check if integers only
                case '*': return rval * lval;
                case '/': return rval / lval;
                case '+': return rval + lval;
                case '-': return rval - lval;
                default:
                    console.error('unsupported operator');
            }
        }

        console.error(`expr "${expr.toCode()}" could not be evaluated`);
        return -1;
    }

}
