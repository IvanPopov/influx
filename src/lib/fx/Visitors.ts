import { IInstruction, EInstructionTypes, IReturnStmtInstruction, IDeclStmtInstruction, IExprStmtInstruction, IIfStmtInstruction, IStmtBlockInstruction, IForStmtInstruction, IWhileStmtInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IFunctionCallInstruction, IIdExprInstruction, IInitExprInstruction, ILiteralInstruction, ILogicalExprInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IRelationalExprInstruction, ISamplerStateBlockInstruction, IUnaryExprInstruction, IVariableTypeInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IVariableDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

export function visitor(owner: IInstruction, cb: (instr: IInstruction, owner?: IInstruction) => void) {
    if (!owner) {
        return;
    }

    const visit = (instr: IInstruction) => { 
        if (instr) {
            cb(instr, owner); 
            visitor(instr, cb) 
        }
    };

    switch (owner.instructionType) {

        //
        // Stmt
        //

        case EInstructionTypes.k_ReturnStmtInstruction:
            visit((owner as IReturnStmtInstruction).expr);
            break;
        case EInstructionTypes.k_DeclStmtInstruction:
            (owner as IDeclStmtInstruction).declList.forEach(decl => visit(decl));
            break;
        case EInstructionTypes.k_ExprStmtInstruction:
            visit((owner as IExprStmtInstruction).expr);
            break;
        case EInstructionTypes.k_IfStmtInstruction:
            visit((owner as IIfStmtInstruction).cond);
            visit((owner as IIfStmtInstruction).conseq);
            visit((owner as IIfStmtInstruction).contrary);
            break;
        case EInstructionTypes.k_StmtBlockInstruction:
            (owner as IStmtBlockInstruction).stmtList.forEach(stmt => visit(stmt));
            break;
        case EInstructionTypes.k_ForStmtInstruction:
            visit((owner as IForStmtInstruction).init);
            visit((owner as IForStmtInstruction).cond);
            visit((owner as IForStmtInstruction).body);
            visit((owner as IForStmtInstruction).step);
            break;
        case EInstructionTypes.k_WhileStmtInstruction:
            visit((owner as IWhileStmtInstruction).cond);
            visit((owner as IWhileStmtInstruction).body);
            break;

        //
        // Expr
        //

        case EInstructionTypes.k_ArithmeticExprInstruction:
            visit((owner as IArithmeticExprInstruction).left);
            visit((owner as IArithmeticExprInstruction).right);
            break;
        case EInstructionTypes.k_AssignmentExprInstruction:
            visit((owner as IAssignmentExprInstruction).left);
            visit((owner as IAssignmentExprInstruction).right);
            break;
        case EInstructionTypes.k_CastExprInstruction:
            visit((owner as ICastExprInstruction).expr);
            break;
        case EInstructionTypes.k_CompileExprInstruction:
            (owner as ICompileExprInstruction).args.forEach(arg => visit(arg));
            visit((owner as ICompileExprInstruction).function);
            break;
        case EInstructionTypes.k_ComplexExprInstruction:
            visit((owner as IComplexExprInstruction).expr);
            break;
        case EInstructionTypes.k_ConditionalExprInstruction:
            visit((owner as IConditionalExprInstruction).left);
            visit((owner as IConditionalExprInstruction).right);
            visit((owner as IConditionalExprInstruction).condition);
            break;
        case EInstructionTypes.k_ConstructorCallInstruction:
            (owner as IConstructorCallInstruction).arguments.forEach(arg => visit(arg));
            visit((owner as IConstructorCallInstruction).ctor);
            break;
        case EInstructionTypes.k_FunctionCallInstruction:
            (owner as IFunctionCallInstruction).args.forEach(arg => visit(arg));
            visit((owner as IFunctionCallInstruction).declaration);
            break;
        case EInstructionTypes.k_IdExprInstruction:
            visit((owner as IIdExprInstruction).id);
            break;
        case EInstructionTypes.k_InitExprInstruction:
            (owner as IInitExprInstruction).arguments.forEach(arg => visit(arg));
            break;
        case EInstructionTypes.k_IntInstruction:
        case EInstructionTypes.k_FloatInstruction:
        case EInstructionTypes.k_BoolInstruction:
        case EInstructionTypes.k_StringInstruction:
            // nothing todo
            break;
        case EInstructionTypes.k_LogicalExprInstruction:
            visit((owner as ILogicalExprInstruction).left);
            visit((owner as ILogicalExprInstruction).right);
            break;
        case EInstructionTypes.k_PostfixArithmeticInstruction:
            visit((owner as IPostfixArithmeticInstruction).expr);
            break;
        case EInstructionTypes.k_PostfixIndexInstruction:
            visit((owner as IPostfixIndexInstruction).element);
            visit((owner as IPostfixIndexInstruction).index);
            break;
        case EInstructionTypes.k_PostfixPointInstruction:
            visit((owner as IPostfixPointInstruction).element);
            visit((owner as IPostfixPointInstruction).postfix);
            break;
        case EInstructionTypes.k_RelationalExprInstruction:
            visit((owner as IRelationalExprInstruction).left);
            visit((owner as IRelationalExprInstruction).right);
            break;
        case EInstructionTypes.k_SamplerStateBlockInstruction:
            (owner as ISamplerStateBlockInstruction).params.forEach(param => visit(param));
            visit((owner as ISamplerStateBlockInstruction).texture);
            break;
        case EInstructionTypes.k_UnaryExprInstruction:
            visit((owner as IUnaryExprInstruction).expr);
            break;

        //
        // Others
        //
        case EInstructionTypes.k_ComplexTypeInstruction:
            (owner as ITypeInstruction).fields.forEach(field => visit(field));
            break;
        case EInstructionTypes.k_FunctionDefInstruction:
            visit((owner as IFunctionDefInstruction).functionName);
            visit((owner as IFunctionDefInstruction).returnType);
            (owner as IFunctionDefInstruction).paramList.forEach(param => visit(param));
            break;
        case EInstructionTypes.k_FunctionDeclInstruction:
            visit((owner as IFunctionDeclInstruction).definition);
            visit((owner as IFunctionDeclInstruction).implementation);
            break;
        case EInstructionTypes.k_VariableDeclInstruction:
            visit((owner as IVariableDeclInstruction).type);
            visit((owner as IVariableDeclInstruction).initExpr);
            visit((owner as IVariableDeclInstruction).id);
            break;
        case EInstructionTypes.k_VariableTypeInstruction:
            visit((owner as IVariableTypeInstruction).subType);
            break;
        case EInstructionTypes.k_IdInstruction:
            // nothing todo
            break;
        case EInstructionTypes.k_SystemFunctionDeclInstruction:
        case EInstructionTypes.k_SystemTypeInstruction:
            // nothing todo
            break;

        default:
            console.error('unsupported instruction type found');
    }
}