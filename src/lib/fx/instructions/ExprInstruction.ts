import { assert } from "@lib/common";
import { EInstructionTypes, IAssignmentExprInstruction, IExprInstruction, IIdExprInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IComplexExprInstruction } from "@lib/idl/IInstruction";
import { ITypedInstructionSettings, TypedInstruction } from "@lib/fx/instructions/TypedInstruction";

export interface IExprInstructionSettings extends ITypedInstructionSettings {
    
}

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _evalResult: any;

    constructor({ ...settings }: ITypedInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ExprInstruction, ...settings });
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
        switch(expr.instructionType) {
            case EInstructionTypes.k_PostfixPointInstruction:
                return ExprInstruction.UnwindExpr((<IPostfixPointInstruction>expr).element);
            case EInstructionTypes.k_PostfixIndexInstruction:
                return ExprInstruction.UnwindExpr((<IPostfixIndexInstruction>expr).element);
            case EInstructionTypes.k_IdExprInstruction:
                return (<IIdExprInstruction>expr).decl;
            case EInstructionTypes.k_ArithmeticExprInstruction:
                // arithmetic expression returns right-hand value;
                return null;
            case EInstructionTypes.k_InitExprInstruction:
                assert(false, 'init expression doesn\'t support unwind operation');
                return null;
            case EInstructionTypes.k_AssignmentExprInstruction:
                // todo: reseach how it work in HLSL
                //// assigment expression returns right-hand value;
                return ExprInstruction.UnwindExpr((<IAssignmentExprInstruction>expr).left);
            case EInstructionTypes.k_CastExprInstruction:
                // cast expression returns right-hand value;
                return null;
            case EInstructionTypes.k_UnaryExprInstruction:
                // unary expression returns right-hand value;
                return null;
            case EInstructionTypes.k_RelationalExprInstruction:
                // relation expression returns right-hand value;
                return null;
            case EInstructionTypes.k_ConstructorCallInstruction:
                // ctor call expression is not allowed as l-value;
                // todo: allow it?
                return null;
            case EInstructionTypes.k_ComplexExprInstruction:
                return ExprInstruction.UnwindExpr((<IComplexExprInstruction>expr).expr);
            case EInstructionTypes.k_IntInstruction:
            case EInstructionTypes.k_FloatInstruction:
            case EInstructionTypes.k_StringInstruction:
            case EInstructionTypes.k_BoolInstruction:
                // literal cannot be a left-hand value;
                return null;
            case EInstructionTypes.k_FunctionCallInstruction:
                // function call expression returns right-hand value;
                return null;
            default:
                assert(false, "unsupported expr found");
                return null;
        }
    }
}
