import { assert, isDef, mwalk } from "@lib/common";
import { Instruction } from "@lib/fx/instructions/Instruction";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { EInstructionTypes, IAnnotationInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction, ICastExprInstruction } from "@lib/idl/IInstruction";

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
    protected knownFunctions: number[] = [];
    protected options: ICodeEmitterOptions;

    constructor(options: ICodeEmitterOptions = { mode: 'raw' }) {
        super();
        this.options = options;
    }

    get mode(): string {
        return this.options.mode;
    }

    protected isMain() {
        return this.depth() === 1;
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


    emitLine(line: string, comment?: string) {
        this.emitChar(line);
        comment && assert(comment.split('\n').length === 1);
        comment && (this.emitChar('\t'), this.emitComment(comment));
        this.emitNewline(); 
    }

    emitComment(comment: string) {
        //
        if (comment.indexOf('\n') === -1) {
            this.emitLine(`// ${comment}`);
            return;
        }

        /**
         * 
         */
        this.emitLine('/**');
        this.push(' * ');
        comment.split('\n').forEach(line => this.emitLine(line));
        this.pop();
        this.emitLine(' */');
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
        src.initExpr && (this.emitKeyword('='), this.emitSpace(), this.emitExpression(src.initExpr));
        src.semantic && this.emitSemantic(src.semantic);
        src.annotation && this.emitAnnotation(src.annotation);
    }

    emitSemantic(semantic: string) {
        this.emitChar(':');
        this.emitKeyword(semantic);
    }

    emitAnnotation(anno: IAnnotationInstruction) {
        // TODO: add annotation emission.
    }

    emitCompile(compile: ICompileExprInstruction) {
        this.emitFunction(compile.function);
        
        this.emitKeyword('compile');
        this.emitKeyword(compile.function.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(compile.args);
        this.emitChar(')');
    }

    emitFunction(fn: IFunctionDeclInstruction) {
        const def = fn.def;
        const { typeName } = this.resolveType(def.returnType);

        this.begin();
        {
            this.emitKeyword(typeName);
            this.emitKeyword(fn.name);
            this.emitChar('(');
            this.emitNoSpace();
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
        | ICastExprInstruction
        | ILogicalExprInstruction
        | IPostfixIndexInstruction
        | ISamplerStateBlockInstruction
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
            case EInstructionTypes.k_ComplexExprInstruction:
                return this.emitComplexExpr(expr as IComplexExprInstruction);
            case EInstructionTypes.k_CompileExprInstruction:
                return this.emitCompile(expr as ICompileExprInstruction);
            case EInstructionTypes.k_ConditionalExprInstruction:
                return this.emitConditionalExpr(expr as IConditionalExprInstruction);
            case EInstructionTypes.k_RelationalExprInstruction:
                return this.emitRelationalExpr(expr as IRelationalExprInstruction);
            case EInstructionTypes.k_UnaryExprInstruction:
                return this.emitUnaryExpr(expr as IUnaryExprInstruction);
            case EInstructionTypes.k_PostfixArithmeticInstruction:
                return this.emitPostfixArithmetic(expr as IPostfixArithmeticInstruction);
            case EInstructionTypes.k_InitExprInstruction:
                return this.emitInitExpr(expr as IInitExprInstruction);
            case EInstructionTypes.k_CastExprInstruction:
                return this.emitCast(expr as ICastExprInstruction);
            default:
                assert(false, 'unsupported instruction found');
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

    emitComplexExpr(complex: IComplexExprInstruction) {
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(complex.expr);
        this.emitChar(')');
    }

    emitConditionalExpr(cond: IConditionalExprInstruction) {
        this.emitExpression(cond.condition);
        this.emitKeyword('?');
        this.emitExpression(cond.left as IExprInstruction);
        this.emitKeyword(':');
        this.emitExpression(cond.right as IExprInstruction);
    }

    emitInteger(lit: ILiteralInstruction<number>) {
        this.emitKeyword(lit.value.toFixed(0));
    }

    emitRelationalExpr(rel: IRelationalExprInstruction) {
        this.emitExpression(rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(rel.right);
    }

    emitUnaryExpr(unary: IUnaryExprInstruction) {
        this.emitChar(unary.operator);
        this.emitExpression(unary.expr);
    }

    emitPostfixArithmetic(par: IPostfixArithmeticInstruction) {
        this.emitExpression(par.expr);
        this.emitChar(par.operator);
    }

    emitExpressionList(list: IExprInstruction[]) {
        list.forEach((expr, i) => {
            this.emitExpression(expr);
            (i != list.length - 1) && this.emitChar(',');
        })
    }

    emitInitExpr(init: IInitExprInstruction) {
        if (init.args.length > 1) {
            this.emitChar('{');
            this.emitNoSpace();
            this.emitExpressionList(init.args);
            this.emitChar('}');
            return;
        }

        this.emitExpression(init.args[0]);
    }

    emitCast(cast: ICastExprInstruction) {
        if (cast.isUseless()) {
            return;
        }

        this.emitChar('(');
        this.emitNoSpace();

        const { typeName } = this.resolveType(cast.type);
        this.emitKeyword(typeName);

        this.emitChar(')');
        this.emitNoSpace();
        this.emitExpression(cast.expr);
    }

    emitArithmetic(arthm: IArithmeticExprInstruction) {
        this.emitExpression(arthm.left);
        this.emitKeyword(arthm.operator);
        this.emitExpression(arthm.right);
    }

    emitAssigment(asgm: IAssignmentExprInstruction) {
        this.emitExpression(asgm.left);
        this.emitKeyword('=');
        this.emitSpace();
        assert(Instruction.isExpression(asgm.right));
        this.emitExpression(asgm.right as IExprInstruction);
    }



    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        this.emitExpression(pfxp.element);
        this.emitChar('.');
        this.emitChar(pfxp.postfix.name);
    }


    emitIdentifier(id: IIdExprInstruction) {
        const decl = id.decl;
        const name = id.name;


        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.isUniform();

        if (decl.isGlobal() || isUniformArg) {
            assert(decl.isUniform());

            if (this.knownGlobals.indexOf(name) === -1) {
                this.begin();
                this.emitStmt(decl);
                this.end();
                this.knownGlobals.push(name);
            }
        }

        this.emitKeyword(name);
    }


    emitCCall(call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = this.resolveType(call.ctor);

        this.emitKeyword(typeName);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(args);
        this.emitChar(')');
    }


    emitFCall(call: IFunctionCallInstruction) {
        const decl = call.decl;
        const args = call.args;

        if (decl.instructionType !== EInstructionTypes.k_SystemFunctionDeclInstruction) {
            if (this.knownFunctions.indexOf(decl.instructionID) === -1) {
                this.emitFunction(decl);
                this.knownFunctions.push(decl.instructionID);
            }
        }

        this.emitKeyword(decl.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(args);
        this.emitChar(')');
    }


    emitReturnStmt(stmt: IReturnStmtInstruction) {
        this.emitKeyword('return');
        this.emitExpression(stmt.expr);
        this.emitChar(';');
    }


    emitExpressionStmt(stmt: IExprStmtInstruction) {
        this.emitExpression(stmt.expr);
        this.emitChar(';');
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
                (stmt as IDeclStmtInstruction).declList.forEach(dcl => (this.emitStmt(dcl)));
                break;
            case EInstructionTypes.k_ExprStmtInstruction:
                this.emitExpressionStmt(stmt as IExprStmtInstruction);
                break;
            case EInstructionTypes.k_ReturnStmtInstruction:
                this.emitReturnStmt(stmt as IReturnStmtInstruction);
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

    emitPass(pass: IPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        this.emitPassBody(pass);
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }

    

    emitPassBody(pass: IPassInstruction) {
        // TODO: replace with emitCompile();
        pass.vertexShader && (
            this.emitFunction(pass.vertexShader),
            
            this.emitKeyword('VertexShader'),
            this.emitKeyword('='),
            this.emitKeyword('compile'),
            this.emitKeyword(pass.vertexShader.name),
            this.emitChar('()'),
            this.emitChar(';'),
            this.emitNewline()
        );

        pass.pixelShader && (
            this.emitFunction(pass.pixelShader),

            this.emitKeyword('PixelShader'),
            this.emitKeyword('='),
            this.emitKeyword('compile'),
            this.emitKeyword(pass.pixelShader.name),
            this.emitChar('()'),
            this.emitChar(';'),
            this.emitNewline()
        );

        this.emitNewline();
        
        // mwalk(pass.renderStates, (val, key) => {
        //     console.log(ERenderStates[key], ERenderStateValues[val]);
        // });
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