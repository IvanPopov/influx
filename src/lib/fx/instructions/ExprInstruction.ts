import { assert, isNull } from "@lib/common";
import { EInstructionTypes, IAssignmentExprInstruction, IExprInstruction, IIdExprInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IComplexExprInstruction } from "@lib/idl/IInstruction";
import { ITypedInstructionSettings, TypedInstruction } from "@lib/fx/instructions/TypedInstruction";

export interface IExprInstructionSettings extends ITypedInstructionSettings {
    
}

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _evalResult: any;

    constructor({ ...settings }: ITypedInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Expr, ...settings });
        this._evalResult = null;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>super.type;
    }

    evaluate(): boolean {
        console.error("@pure_virtual");
        return false;
    }

    getEvalValue(): any {
        return this._evalResult;
    }

    isConst(): boolean {
        console.error("@pure_virtual");
        return false;
    }

    isConstExpr(): boolean {
        // todo: implement it properly
        return true;
    }

    /**
     * unwind operation returns declaration in case of correct l-value expression;
     */
    static UnwindExpr(expr: IExprInstruction): IVariableDeclInstruction {
        if (isNull(expr)) {
            return null;
        }
        
        switch(expr.instructionType) {
            case EInstructionTypes.k_PostfixPointExpr:
                return ExprInstruction.UnwindExpr((<IPostfixPointInstruction>expr).element);
            case EInstructionTypes.k_PostfixIndexExpr:
                return ExprInstruction.UnwindExpr((<IPostfixIndexInstruction>expr).element);
            case EInstructionTypes.k_IdExpr:
                return (<IIdExprInstruction>expr).decl;
            case EInstructionTypes.k_ArithmeticExpr:
                // arithmetic expression returns right-hand value;
                return null;
            case EInstructionTypes.k_InitExpr:
                assert(false, 'init expression doesn\'t support unwind operation');
                return null;
            case EInstructionTypes.k_AssignmentExpr:
                // todo: reseach how it work in HLSL
                //// assigment expression returns right-hand value;
                return ExprInstruction.UnwindExpr((<IAssignmentExprInstruction>expr).left);
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
                return ExprInstruction.UnwindExpr((<IComplexExprInstruction>expr).expr);
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
