import { assert, isNull } from "@lib/common";
import { instruction } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IAnnotationInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction, ICbufferInstruction, IInstructionCollector, IBitwiseExprInstruction, IPostfixIndexInstruction, ITypeDeclInstruction, ILogicalExprInstruction, ITypedefInstruction } from "@lib/idl/IInstruction";

import { IntInstruction } from "../analisys/instructions/IntInstruction";
import { BaseEmitter } from "./BaseEmitter";
import { ISLDocument } from "@lib/idl/ISLDocument";

export interface ITypeInfo {
    typeName: string;
    length: number;
    usage?: string;
}

export interface ICodeEmitterOptions {
    mode: 'vertex' | 'pixel' | 'raw';
}

const asSTRID = (decl: IVariableDeclInstruction) => `${decl.name}${decl.instructionID}`;

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
        if (!type) {
            return null;
        }
        
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
                this.emit(type);
                this.knownTypes.push(typeName);
            }
        }

        if (type.instructionType === EInstructionTypes.k_VariableType) {
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

        if (src.isGlobal())
        {
            this.knownGlobals.push(asSTRID(src));
        }
    }


    emitIfStmt(stmt: IIfStmtInstruction): void {
        this.emitKeyword('if');
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(stmt.cond);
        this.emitChar(')');
        this.emitNewline();
        
        if (stmt.conseq) {
            this.emitStmt(stmt.conseq);
        } else {
            this.emitChar(';');
        }

        if (stmt.contrary) {
            this.emitNewline();
            this.emitKeyword('else');
            this.emitStmt(stmt.contrary);
        }
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

        if (!fn || fn.instructionType === EInstructionTypes.k_SystemFunctionDecl) {
           return;
        }

        if (this.knownFunctions.indexOf(fn.instructionID) !== -1) {
            return;
        }

        this.knownFunctions.push(fn.instructionID);

        const def = fn.def;
        const { typeName } = this.resolveType(def.returnType);

        this.begin();
        {
            this.emitKeyword(typeName);
            this.emitKeyword(fn.name);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitParams(def.params);
            this.emitChar(')');
            this.emitNewline();
            this.emitBlock(fn.impl);
        }
        this.end();
    }


    emitCollector(instr: IInstructionCollector) {
        this.begin();
        instr.instructions.forEach(instr => {
            this.emit(instr);
            this.emitNewline();
        });
        this.end();
    }


    emitTypeDecl(instr: ITypeDeclInstruction) {
        this.resolveType(instr.type);
    }

    emitTypedef(instr: ITypedefInstruction) {
        this.emitKeyword('typedef');
        // todo: add support for typedefs like:
        //  typedef const float4 T;
        //          ^^^^^^^^^^^^
        this.emitKeyword(instr.type.name);
        this.emitKeyword(instr.alias);
        this.emitChar(';');
        this.emitNewline();
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
            case EInstructionTypes.k_ArithmeticExpr:
                return this.emitArithmetic(expr as IArithmeticExprInstruction);
            case EInstructionTypes.k_AssignmentExpr:
                return this.emitAssigment(expr as IAssignmentExprInstruction);
            case EInstructionTypes.k_PostfixPointExpr:
                return this.emitPostfixPoint(expr as IPostfixPointInstruction);
            case EInstructionTypes.k_IdExpr:
                return this.emitIdentifier(expr as IIdExprInstruction);
            case EInstructionTypes.k_FunctionCallExpr:
                return this.emitFCall(expr as IFunctionCallInstruction);
            case EInstructionTypes.k_ConstructorCallExpr:
                return this.emitCCall(expr as IConstructorCallInstruction);
            case EInstructionTypes.k_FloatExpr:
                return this.emitFloat(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_IntExpr:
                return this.emitInteger(expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_BoolExpr:
                return this.emitBool(expr as ILiteralInstruction<boolean>);
            case EInstructionTypes.k_ComplexExpr:
                return this.emitComplexExpr(expr as IComplexExprInstruction);
            case EInstructionTypes.k_CompileExpr:
                return this.emitCompile(expr as ICompileExprInstruction);
            case EInstructionTypes.k_ConditionalExpr:
                return this.emitConditionalExpr(expr as IConditionalExprInstruction);
            case EInstructionTypes.k_RelationalExpr:
                return this.emitRelationalExpr(expr as IRelationalExprInstruction);
            case EInstructionTypes.k_LogicalExpr:
                return this.emitLogicalExpr(expr as ILogicalExprInstruction);
            case EInstructionTypes.k_UnaryExpr:
                return this.emitUnaryExpr(expr as IUnaryExprInstruction);
            case EInstructionTypes.k_PostfixArithmeticExpr:
                return this.emitPostfixArithmetic(expr as IPostfixArithmeticInstruction);
            case EInstructionTypes.k_InitExpr:
                return this.emitInitExpr(expr as IInitExprInstruction);
            case EInstructionTypes.k_CastExpr:
                return this.emitCast(expr as ICastExprInstruction);
            case EInstructionTypes.k_BitwiseExpr:
                return this.emitBitwise(expr as IBitwiseExprInstruction);
            case EInstructionTypes.k_PostfixIndexExpr:
                return this.emitPostfixIndex(expr as IPostfixIndexInstruction);
            default:
                assert(false, `unsupported instruction found: ${expr.instructionName}`);
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
        // TODO: use IIntInstructions instead of ILiteralInstruction
        this.emitKeyword(`${lit.value.toFixed(0)}${!(lit as IntInstruction).signed? 'u': ''}`);
    }

    emitRelationalExpr(rel: IRelationalExprInstruction) {
        this.emitExpression(rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(rel.right);
    }

    emitLogicalExpr(rel: ILogicalExprInstruction) {
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

    emitPostfixIndex(pfidx: IPostfixIndexInstruction)
    {
        this.emitExpression(pfidx.element);
        this.emitChar('[');
        this.emitNoSpace();
        this.emitExpression(pfidx.index);
        this.emitChar(']');
    }

    emitExpressionList(list: IExprInstruction[]) {
        (list || []).forEach((expr, i) => {
            this.emitExpression(expr);
            (i != list.length - 1) && this.emitChar(',');
        })
    }

    emitParams(params: IVariableDeclInstruction[]) {
        params.forEach((param, i, list) => {
            this.emitVariableDecl(param);
            (i + 1 != list.length) && this.emitChar(',');
        });
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

    emitBitwise(bwise: IBitwiseExprInstruction) {
        this.emitExpression(bwise.left);
        this.emitKeyword(bwise.operator);
        this.emitSpace();
        this.emitExpression(bwise.right);
    }

    emitArithmetic(arthm: IArithmeticExprInstruction) {
        this.emitExpression(arthm.left);
        this.emitKeyword(arthm.operator);
        this.emitSpace();
        this.emitExpression(arthm.right);
    }

    emitAssigment(asgm: IAssignmentExprInstruction) {
        this.emitExpression(asgm.left);
        this.emitKeyword('=');
        this.emitSpace();
        assert(instruction.isExpression(asgm.right));
        this.emitExpression(asgm.right as IExprInstruction);
    }



    emitPostfixPoint(pfxp: IPostfixPointInstruction) {
        // todo: skip brackets wherever possible to avoid exprs like (a).x;
        if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr ||
            pfxp.element.instructionType === EInstructionTypes.k_PostfixPointExpr) {
            this.emitExpression(pfxp.element);
        } else {
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpression(pfxp.element);
            this.emitChar(')');
        }
        this.emitChar('.');
        this.emitChar(pfxp.postfix.name);
    }


    emitCbuffer(cbuf: ICbufferInstruction) {
        this.begin();
        this.emitComment(`size: ${cbuf.type.size}`);
        this.emitKeyword('cbuffer');
        if (cbuf.id) {
            this.emitKeyword(cbuf.name);
        }
        const reg = cbuf.register;
        if (reg.index !== -1) {
            this.emitChar(':');
            this.emitKeyword('register');
            this.emitChar('(');
            this.emitNoSpace();
            this.emitKeyword(`${reg.type}${reg.index}`);
            this.emitNoSpace();
            this.emitChar(')');
        }
        this.emitNewline();
        this.emitChar('{');
        this.push();
        {
            cbuf.type.fields.forEach(field => {
                this.emitVariableDecl(field);
                this.emitChar(';');
                this.emitChar('\t')
                this.emitComment(`padding ${field.type.padding}, size ${field.type.size}`);
            });
        }
        this.pop();
        this.emitChar('}');
        // emit annotation?
        this.end();
    }


    emitGlobal(decl: IVariableDeclInstruction) {
        const name = decl.name;

        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.type.isUniform();

        if (decl.isGlobal() || isUniformArg) {
            // assert(decl.type.isUniform());
            if (this.knownGlobals.indexOf(asSTRID(decl)) === -1) {
                this.begin();
                this.emitStmt(decl);
                this.end();
                this.knownGlobals.push(asSTRID(decl));
            }
        }
    }

    emitGlobalRaw(name: string, content: string) {
        if (this.knownGlobals.indexOf(name) === -1) {
            this.begin();
            this.emitChar(`${content};`);
            this.emitNewline();
            this.end();
            this.knownGlobals.push(name);
        }
    }

    emitIdentifier(id: IIdExprInstruction) {
        const { decl, name } = id;

        this.emitGlobal(decl);
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

        this.emitFunction(decl);

        this.emitKeyword(decl.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(args);
        this.emitChar(')');
    }


    emitReturnStmt(stmt: IReturnStmtInstruction) {
        this.emitKeyword('return');
        this.emitSpace();
        this.emitExpression(stmt.expr);
        this.emitChar(';');
    }


    emitExpressionStmt(stmt: IExprStmtInstruction) {
        this.emitExpression(stmt.expr);
        this.emitChar(';');
    }


    /*
        | IStmtBlockInstruction
        | IWhileStmtInstruction
        | IForStmtInstruction;
    */
    emitStmt(stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_DeclStmt:
                (stmt as IDeclStmtInstruction).declList.forEach(dcl => (this.emitStmt(dcl)));
                break;
            case EInstructionTypes.k_ExprStmt:
                this.emitExpressionStmt(stmt as IExprStmtInstruction);
                break;
            case EInstructionTypes.k_ReturnStmt:
                this.emitReturnStmt(stmt as IReturnStmtInstruction);
                break;
            case EInstructionTypes.k_VariableDecl:
                this.emitVariableDecl(stmt as IVariableDeclInstruction);
                this.emitChar(';');
                break;
            case EInstructionTypes.k_SemicolonStmt:
                this.emitChar(';');
                break;
            case EInstructionTypes.k_IfStmt:
                this.emitIfStmt(stmt as IIfStmtInstruction);
                break;
            case EInstructionTypes.k_StmtBlock:
                this.emitBlock(stmt as IStmtBlockInstruction);
                break;
            default:
                console.warn(`unknown stmt found: '${stmt.instructionName}'`);
        }
    }

    emitBlock(blk: IStmtBlockInstruction) {
        // if (!blk.stmtList.length)
        // {
        //     this.emitChar(';');
        //     return;
        // }

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
            // TODO: emit error.
            return this;
        }

        if (instruction.isExpression(instr)) {
            this.emitExpression(instr as IExprInstruction);
            return this;
        }

        if (instruction.isStatement(instr)) {
            this.emitStmt(instr);
            return this;
        }

        //
        // Other types
        //

        switch (instr.instructionType) {
            case EInstructionTypes.k_FunctionDecl:
                this.emitFunction(instr as IFunctionDeclInstruction);
                break;
            case EInstructionTypes.k_CbufferDecl:
                this.emitCbuffer(instr as ICbufferInstruction);
                break;
            case EInstructionTypes.k_VariableDecl:
                this.begin();
                this.emitVariableDecl(instr as IVariableDeclInstruction);
                this.emitChar(';');
                this.end();
                break;
            case EInstructionTypes.k_Collector:
                this.emitCollector(instr as IInstructionCollector);
                break;
            case EInstructionTypes.k_TypeDecl:
                this.emitTypeDecl(instr as ITypeDeclInstruction);
                break;
            case EInstructionTypes.k_TypedefDecl:
                this.emitTypedef(instr as ITypedefInstruction);
                break;
            case EInstructionTypes.k_ComplexType:
            case EInstructionTypes.k_VariableType:
                this.begin();
                this.emitComplexType(instr as ITypeInstruction);
                this.emitChar(';');
                this.end();
                break;
            default:
                assert(false, `unsupported instruction found: ${instr.instructionName}`);
        }

        return this;
    }
}


export function translate(instr: IInstruction, options?: ICodeEmitterOptions): string {
    return (new CodeEmitter(options)).emit(instr).toString();
}

export function translateDocument(document: ISLDocument): string {
    if (isNull(document)) {
        return '';
    }

    if (isNull(document.root)) {
        return '';
    }

    return translate(document.root);
}


// export function translateDocument(document: ISLDocument): ITextDocument {
//     let source = '';
//     let uri = null;

//     if (isNull(document)) {
//         return null
//     }

//     uri = document.uri;
    
//     if (isNull(document.root)) {
//         return { uri, source };
//     }

//     source = translate(document.root);
//     return { uri, source };
// }

