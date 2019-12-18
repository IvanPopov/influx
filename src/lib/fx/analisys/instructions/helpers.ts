import { assert, isNull } from "@lib/common";
import { EInstructionTypes, IAssignmentExprInstruction, IComplexExprInstruction, IExprInstruction, IFunctionDefInstruction, IIdExprInstruction, IInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

export namespace fn {
    export function toSignature(def: IFunctionDefInstruction): string {
        const { name, returnType, params } = def;
        return `${returnType.name} ${name}(${params.map(param => {
            if (param) {
                const type = param.type;
                const usages = type.usages.length > 0 ? `${type.usages.join(' ')} ` : '';
                return `${usages}${type.name}${param.initExpr ? '?' : ''}`;
            }
            return '*';
        }).join(', ')})`;
    }


    export function numArgsRequired(def: IFunctionDefInstruction): number {
        return def.params.filter((param) => !param || !param.initExpr).length;
    }
}


export namespace type {
    // todo: rename it
    /** @deprecated */
    export function isInheritedFromVariableDecl(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }
        const parentType = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDecl) {
            return true;
        }
        else if (parentType === EInstructionTypes.k_VariableType) {
            return isInheritedFromVariableDecl(<IVariableTypeInstruction>type.parent);
        }
        return false;
    }


    /** @deprecated */
    export function isTypeOfField(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }

        if (type.parent.instructionType === EInstructionTypes.k_VariableDecl) {
            let pParentDecl: IVariableDeclInstruction = <IVariableDeclInstruction>type.parent;
            return pParentDecl.isField();
        }

        return false;
    }


    /** @deprecated */
    export function findParentContainer(type: IVariableTypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type) || !isTypeOfField(type)) {
            return null;
        }

        let containerType: IVariableTypeInstruction = <IVariableTypeInstruction>findParentVariableDecl(type).parent;
        if (!isInheritedFromVariableDecl(containerType)) {
            return null;
        }

        return findParentVariableDecl(containerType);
    }


    /** @deprecated */
    export function findParentVariableDecl(type: ITypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType: EInstructionTypes = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDecl) {
            return <IVariableDeclInstruction>type.parent;
        }

        return findParentVariableDecl(<IVariableTypeInstruction>type.parent);
    }


    /** @deprecated */
    export function findParentVariableDeclName(type: ITypeInstruction): string {
        let varDecl = findParentVariableDecl(type)
        return isNull(varDecl) ? null : varDecl.name;
    }



    /** @deprecated */
    export function finParentTypeDecl(type: ITypeInstruction): ITypeDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_TypeDecl) {
            return <ITypeDeclInstruction>type.parent;
        }
        return finParentTypeDecl(<ITypeInstruction>type.parent);
    }


    /** @deprecated */
    export function finParentTypeDeclName(type: IVariableTypeInstruction): string {
        let typeDecl = finParentTypeDecl(type);
        return isNull(typeDecl) ? null : typeDecl.name;
    }


    /** @deprecated */
    export function resolveVariableDeclFullName(type: ITypeInstruction): string {
        if (!isInheritedFromVariableDecl(type)) {
            console.error("Not from variable decl");
            return null;
        }

        return findParentVariableDecl(type).fullName;
    }


    // todo: add comment
    // todo: review this code
    /** @deprecated */
    export function findMainVariable(type: ITypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        if (isTypeOfField(type)) {
            return findMainVariable(<IVariableTypeInstruction>type.parent.parent);
        }
        return findParentVariableDecl(type);
    }
}


export namespace expression {
    /**
     * unwind operation returns declaration in case of correct l-value expression;
     */
    export function Unwind(expr: IExprInstruction): IVariableDeclInstruction {
        if (isNull(expr)) {
            return null;
        }

        switch (expr.instructionType) {
            case EInstructionTypes.k_PostfixPointExpr:
                return Unwind((<IPostfixPointInstruction>expr).element);
            case EInstructionTypes.k_PostfixIndexExpr:
                return Unwind((<IPostfixIndexInstruction>expr).element);
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
                return Unwind((<IAssignmentExprInstruction>expr).left);
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
                return Unwind((<IComplexExprInstruction>expr).expr);
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


export namespace variable {
    /**
 * @param decl Variable declaraion (decl.isParameter() must be true).
 * @returns Serial number of the declaration among the function parameters or -1 otherwise.
 */
    export function getParameterIndex(decl: IVariableDeclInstruction): number {
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return -1;
        }
        // all parameters must be a children on function definition!
        assert(decl.parent.instructionType === EInstructionTypes.k_FunctionDef);
        return (<IFunctionDefInstruction>decl.parent).params.indexOf(decl);
    }

    /**
     * @returns Offset in bytes from the beginning of the parameters' list.
     */
    export function getParameterOffset(decl: IVariableDeclInstruction): number {
        // todo: add support for 'inout', 'out' usages 
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return 0;
        }

        let idx = getParameterIndex(decl);
        let offset = 0;
        for (let i = 0; i < idx; ++i) {
            offset += (<IFunctionDefInstruction>decl.parent).params[i].type.size;
        }
        return offset;
    }
}

export namespace instruction {
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

