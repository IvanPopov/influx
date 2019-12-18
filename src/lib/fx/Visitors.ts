import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprStmtInstruction, IForStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction, IInstruction, ILogicalExprInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, ISamplerStateBlockInstruction, IStmtBlockInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction, IWhileStmtInstruction } from "@lib/idl/IInstruction";

// TODO: move it to helpers
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

        case EInstructionTypes.k_ReturnStmt:
            visit((owner as IReturnStmtInstruction).expr);
            break;
        case EInstructionTypes.k_DeclStmt:
            (owner as IDeclStmtInstruction).declList.forEach(decl => visit(decl));
            break;
        case EInstructionTypes.k_ExprStmt:
            visit((owner as IExprStmtInstruction).expr);
            break;
        case EInstructionTypes.k_IfStmt:
            visit((owner as IIfStmtInstruction).cond);
            visit((owner as IIfStmtInstruction).conseq);
            visit((owner as IIfStmtInstruction).contrary);
            break;
        case EInstructionTypes.k_StmtBlock:
            (owner as IStmtBlockInstruction).stmtList.forEach(stmt => visit(stmt));
            break;
        case EInstructionTypes.k_ForStmt:
            visit((owner as IForStmtInstruction).init);
            visit((owner as IForStmtInstruction).cond);
            visit((owner as IForStmtInstruction).body);
            visit((owner as IForStmtInstruction).step);
            break;
        case EInstructionTypes.k_WhileStmt:
            visit((owner as IWhileStmtInstruction).cond);
            visit((owner as IWhileStmtInstruction).body);
            break;

        //
        // Expr
        //

        case EInstructionTypes.k_ArithmeticExpr:
            visit((owner as IArithmeticExprInstruction).left);
            visit((owner as IArithmeticExprInstruction).right);
            break;
        case EInstructionTypes.k_AssignmentExpr:
            visit((owner as IAssignmentExprInstruction).left);
            visit((owner as IAssignmentExprInstruction).right);
            break;
        case EInstructionTypes.k_CastExpr:
            visit((owner as ICastExprInstruction).expr);
            break;
        case EInstructionTypes.k_CompileExpr:
            (owner as ICompileExprInstruction).args.forEach(arg => visit(arg));
            // visit((owner as ICompileExprInstruction).function);
            break;
        case EInstructionTypes.k_ComplexExpr:
            visit((owner as IComplexExprInstruction).expr);
            break;
        case EInstructionTypes.k_ConditionalExpr:
            visit((owner as IConditionalExprInstruction).left);
            visit((owner as IConditionalExprInstruction).right);
            visit((owner as IConditionalExprInstruction).condition);
            break;
        case EInstructionTypes.k_ConstructorCallExpr:
            (owner as IConstructorCallInstruction).args.forEach(arg => visit(arg));
            // visit((owner as IConstructorCallInstruction).ctor);
            break;
        case EInstructionTypes.k_FunctionCallExpr:
            (owner as IFunctionCallInstruction).args.forEach(arg => visit(arg));
            // visit((owner as IFunctionCallInstruction).decl);
            break;
        case EInstructionTypes.k_IdExpr:
            visit((owner as IIdExprInstruction).id);
            break;
        case EInstructionTypes.k_InitExpr:
            (owner as IInitExprInstruction).args.forEach(arg => visit(arg));
            break;
        case EInstructionTypes.k_IntExpr:
        case EInstructionTypes.k_FloatExpr:
        case EInstructionTypes.k_BoolExpr:
        case EInstructionTypes.k_StringExpr:
            // nothing todo
            break;
        case EInstructionTypes.k_LogicalExpr:
            visit((owner as ILogicalExprInstruction).left);
            visit((owner as ILogicalExprInstruction).right);
            break;
        case EInstructionTypes.k_PostfixArithmeticExpr:
            visit((owner as IPostfixArithmeticInstruction).expr);
            break;
        case EInstructionTypes.k_PostfixIndexExpr:
            visit((owner as IPostfixIndexInstruction).element);
            visit((owner as IPostfixIndexInstruction).index);
            break;
        case EInstructionTypes.k_PostfixPointExpr:
            visit((owner as IPostfixPointInstruction).element);
            visit((owner as IPostfixPointInstruction).postfix);
            break;
        case EInstructionTypes.k_RelationalExpr:
            visit((owner as IRelationalExprInstruction).left);
            visit((owner as IRelationalExprInstruction).right);
            break;
        case EInstructionTypes.k_SamplerStateBlockExpr:
            (owner as ISamplerStateBlockInstruction).params.forEach(param => visit(param));
            visit((owner as ISamplerStateBlockInstruction).texture);
            break;
        case EInstructionTypes.k_UnaryExpr:
            visit((owner as IUnaryExprInstruction).expr);
            break;

        //
        // Others
        //
        case EInstructionTypes.k_ComplexType:
            (owner as ITypeInstruction).fields.forEach(field => visit(field));
            break;
        case EInstructionTypes.k_FunctionDef:
            visit((owner as IFunctionDefInstruction).returnType);
            visit((owner as IFunctionDefInstruction).id);
            (owner as IFunctionDefInstruction).params.forEach(param => visit(param));
            break;
        case EInstructionTypes.k_FunctionDecl:
            visit((owner as IFunctionDeclInstruction).def);
            visit((owner as IFunctionDeclInstruction).impl);
            break;
        case EInstructionTypes.k_VariableDecl:
            visit((owner as IVariableDeclInstruction).type);
            visit((owner as IVariableDeclInstruction).initExpr);
            visit((owner as IVariableDeclInstruction).id);
            break;
        case EInstructionTypes.k_VariableType:
            visit((owner as IVariableTypeInstruction).subType);
            break;
        case EInstructionTypes.k_Id:
            // nothing todo
            break;
        case EInstructionTypes.k_SystemFunctionDecl:
        case EInstructionTypes.k_SystemType:
            // nothing todo
            break;
        case EInstructionTypes.k_BreakStmt:
            break;

        default:
            console.error('unsupported instruction type found');
    }
}

export const Visitor = {
    each: visitor
};

