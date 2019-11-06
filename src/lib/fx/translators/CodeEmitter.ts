import { assert, isDef } from "@lib/common";
import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInstruction, ILiteralInstruction, IPostfixPointInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { Instruction } from "@lib/fx/instructions/Instruction";
import { BaseEmitter } from "./BaseEmitter";



export interface ITypeInfo {
    typeName: string;
    length: number;
    usage?: string;
}

export interface ICodeEmitterOptions {
    mode: 'vertex' | 'pixel' | 'raw';
}

export class CodeEmitter extends BaseEmitter {
    protected knownGlobals: string[] = [];
    protected knownTypes: string[] = [];
    protected options: ICodeEmitterOptions;

    constructor(options: ICodeEmitterOptions = { mode: 'raw' }) {
        super();
        this.options = options;
    }

    get mode(): string {
        return this.options.mode;
    }

    protected resolveTypeName(type: ITypeInstruction): string {
        return type.name;
    }


    protected resolveType(type: ITypeInstruction): ITypeInfo {
        let complex = type.isComplex();

        let length: number;
        let typeName: string;
        let usages: string[];
        let usage: string;

        if (!complex) {
            typeName = this.resolveTypeName(type);
        } else {
            typeName = type.name;

            if (this.knownTypes.indexOf(typeName) === -1) {
                this.begin();
                this.emitComplexType(type);
                this.emitChar(';');
                this.end();

                this.knownTypes.push(typeName);
            }
        }

        if (type.instructionType === EInstructionTypes.k_VariableTypeInstruction) {
            const vtype = type as IVariableTypeInstruction;
            usages = vtype.usages as string[];
        }

        if (type.isNotBaseArray()) {
            length = type.length;
        }

        if (usages && usages.length) {
            usage = usages.join(' ');
        }

        return { typeName, length, usage };
    }


    emitComplexType(ctype: ITypeInstruction) {
        assert(ctype.isComplex());

        this.emitKeyword('struct');
        this.emitKeyword(ctype.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();

        ctype.fields.map(field => (this.emitStmt(field), this.emitNewline()));

        this.pop();
        this.emitChar('}');
    }


    emitVariableDecl(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = this.resolveType(src.type);
        const name = rename ? rename(src) : src.name;

        usage && this.emitKeyword(usage);
        this.emitKeyword(typeName);
        this.emitKeyword(name);
        length && this.emitChar(`[${length}]`);
    }


    emitFunction(fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const { typeName } = this.resolveType(def.returnType);

        this.begin();
        {
            this.emitKeyword(typeName);
            this.emitKeyword(fn.name);
            this.emitChar('(');
            def.params.forEach((param, i, list) => {
                this.emitVariableDecl(param);
                (i + 1 != list.length) && this.emitChar(',');
            });
            this.emitChar(')');
            this.emitNewline();
            this.emitBlock(fn.impl);
        }
        this.end();
    }

    emitExpression(expr: IExprInstruction) {
        if (!expr) {
            return;
        }

        /*
        | IArithmeticExprInstruction
        | ICastExprInstruction
        | ICompileExprInstruction
        | IComplexExprInstruction
        | IConditionalExprInstruction
        | IInitExprInstruction
        | ILogicalExprInstruction
        | IPostfixArithmeticInstruction
        | IPostfixIndexInstruction
        | IRelationalExprInstruction
        | ISamplerStateBlockInstruction
        | IUnaryExprInstruction;
        */
        switch (expr.instructionType) {
            case EInstructionTypes.k_ArithmeticExprInstruction:
                return this.emitArithmetic(expr as IArithmeticExprInstruction);
            case EInstructionTypes.k_AssignmentExprInstruction:
                return this.emitAssigment(expr as IAssignmentExprInstruction);
            case EInstructionTypes.k_PostfixPointInstruction:
                return this.emitPostfixPoint(expr as IPostfixPointInstruction);
            case EInstructionTypes.k_IdExprInstruction:
                return this.emitIdentifier(expr as IIdExprInstruction);
            case EInstructionTypes.k_FunctionCallInstruction:
                return this.emitFCall(expr as IFunctionCallInstruction);
            case EInstructionTypes.k_ConstructorCallInstruction:
                return this.emitCCall(expr as IConstructorCallInstruction);
            case EInstructionTypes.k_FloatInstruction:
                return this.emitFloat(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_IntInstruction:
                return this.emitInteger(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_BoolInstruction:
                return this.emitBool(expr as ILiteralInstruction<boolean>);
        }
    }

    emitFloat(lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.');
        this.emitChar('f');
    }

    emitBool(lit: ILiteralInstruction<boolean>) {
        this.emitKeyword(lit.value ? 'true' : 'false');
    }

    emitInteger(lit: ILiteralInstruction<number>) {
        this.emitKeyword(lit.value.toFixed(0));
    }

    emitArithmetic(arthm: IArithmeticExprInstruction) {
        this.emitExpression(arthm.left);
        this.emitKeyword(arthm.operator);
        this.emitExpression(arthm.right);
    }

    emitAssigment(asgm: IAssignmentExprInstruction) {
        this.emitExpression(asgm.left);
        this.emitKeyword('=');
        assert(Instruction.isExpression(asgm.right));
        this.emitExpression(asgm.right as IExprInstruction);
    }



    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        this.emitExpression(pfxp.element);
        this.emitChar('.');
        this.emitChar(pfxp.postfix.name);
    }


    emitIdentifier(id: IIdExprInstruction) {
        const name = id.name;

        this.emitKeyword(name);
    }


    emitCCall(call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = this.resolveType(call.ctor);

        this.emitKeyword(typeName);
        this.emitChar('(');
        args.forEach((arg, i, list) => {
            this.emitExpression(arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        this.emitChar(' )');
    }


    emitFCall(call: IFunctionCallInstruction) {
        const decl = call.decl;
        const args = call.args;

        if (decl.instructionType !== EInstructionTypes.k_SystemFunctionDeclInstruction) {
            this.emitFunction(decl);
        }

        this.emitKeyword(decl.name);
        this.emitChar('(');
        args.forEach((arg, i, list) => {
            this.emitExpression(arg);
            (i + 1 != list.length) && this.emitChar(',');
        });
        // TODO: fix this hack
        this.emitChar(' )');
    }

    /*
        | IDeclStmtInstruction
        | IReturnStmtInstruction
        | IIfStmtInstruction
        | IStmtBlockInstruction
        | IExprStmtInstruction
        | IWhileStmtInstruction
        | IForStmtInstruction;
    */
    emitStmt(stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_DeclStmtInstruction:
                (stmt as IDeclStmtInstruction).declList.forEach(dcl => (this.emitStmt(dcl), this.emitNewline()));
                break;
            case EInstructionTypes.k_ExprStmtInstruction:
                this.emitExpression((stmt as IExprStmtInstruction).expr);
                this.emitChar(';');
                break;
            case EInstructionTypes.k_ReturnStmtInstruction:
                this.emitKeyword('return');
                this.emitExpression((stmt as IReturnStmtInstruction).expr);
                this.emitChar(';');
                break;
            case EInstructionTypes.k_VariableDeclInstruction:
                this.emitVariableDecl(stmt as IVariableDeclInstruction);
                this.emitChar(';');
                break;
        }
    }

    emitBlock(blk: IStmtBlockInstruction) {
        this.emitChar('{');
        this.push();
        blk.stmtList.forEach(stmt => (this.emitStmt(stmt), this.emitNewline()));
        this.pop();
        this.emitChar('}');
    }

    emit(instr: IInstruction): CodeEmitter {
        if (!instr) {
            return this;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_ConditionalExprInstruction:
            case EInstructionTypes.k_ConstructorCallInstruction:
            case EInstructionTypes.k_AssignmentExprInstruction:
            case EInstructionTypes.k_ArithmeticExprInstruction:
            case EInstructionTypes.k_InitExprInstruction:
            case EInstructionTypes.k_IdExprInstruction:
            case EInstructionTypes.k_FunctionCallInstruction:
            case EInstructionTypes.k_FloatInstruction:
            case EInstructionTypes.k_IntInstruction:
            case EInstructionTypes.k_BoolInstruction:
            case EInstructionTypes.k_PostfixArithmeticInstruction:
            case EInstructionTypes.k_PostfixIndexInstruction:
            case EInstructionTypes.k_PostfixPointInstruction:
            case EInstructionTypes.k_ComplexExprInstruction:
            case EInstructionTypes.k_CastExprInstruction:
            case EInstructionTypes.k_UnaryExprInstruction:
                this.emitExpression(instr as IExprInstruction);
                break
            case EInstructionTypes.k_DeclStmtInstruction:
            case EInstructionTypes.k_ReturnStmtInstruction:
            case EInstructionTypes.k_IfStmtInstruction:
            case EInstructionTypes.k_StmtBlockInstruction:
            case EInstructionTypes.k_ExprStmtInstruction:
            case EInstructionTypes.k_WhileStmtInstruction:
            case EInstructionTypes.k_ForStmtInstruction:
                this.emitStmt(instr);
                break;
            case EInstructionTypes.k_FunctionDeclInstruction:
                this.emitFunction(instr as IFunctionDeclInstruction);
                break;
            default:
                assert(false, 'unsupported instruction found');
        }
        
        return this;
    }
}


export function translate(instr: IInstruction, options?: ICodeEmitterOptions): string {
    return (new CodeEmitter(options)).emit(instr).toString();
}