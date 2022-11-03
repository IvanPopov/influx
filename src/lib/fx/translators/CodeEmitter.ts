import { assert, isNull } from "@lib/common";
import { instruction } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IAnnotationInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, IBitwiseExprInstruction, ICastExprInstruction, ICbufferInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IForStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, ILogicalExprInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypedefInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { StringInstruction } from "@lib/fx/analisys/instructions/StringInstruction";
import { EVariableUsageFlags } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { BaseEmitter } from "./BaseEmitter";
import { FloatInstruction } from "../analisys/instructions/FloatInstruction";
import { BoolInstruction } from "../analisys/instructions/BoolInstruction";

interface ITypeInfo {
    typeName: string;
    length: number;
    usage?: string;
}

export interface IUavReflection {
    register: number;
    name: string;
    type: string;
    uavType: string;
    elementType: string;
};


export interface ICSShaderReflection {
    name: string;
    numthreads: number[];
    uavs: IUavReflection[];
}



export interface ICodeEmitterOptions {
    mode: 'vertex' | 'pixel' | 'raw';
    // do not print 'in' for function parameters even if it is specified
    omitInUsage?: boolean;
    // skip complex type parameters of zero size
    omitEmptyParams?: boolean;
}


export class CodeEmitter extends BaseEmitter {
    protected knownGlobals: string[] = [];
    protected knownTypes: string[] = [];
    protected knownFunctions: number[] = [];
    protected knownUAVs: IUavReflection[] = [];
    protected knownCsShaders: ICSShaderReflection[] = [];

    protected options: ICodeEmitterOptions;

    constructor(options: ICodeEmitterOptions = { mode: 'raw' }) {
        super();
        this.options = options;
    }

    protected static asSTRID = (decl: IVariableDeclInstruction) => `${decl.name}${decl.instructionID}`;


    get mode(): string {
        return this.options.mode;
    }


    protected isMain() {
        return this.depth() === 1;
    }


    protected isPixel() {
        return this.mode === 'pixel';
    }


    protected isVertex() {
        return this.mode === 'vertex';
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

            if (this.addType(typeName)) {
                this.emit(type);
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
            usage = usages.filter(u => !this.options.omitInUsage || u != 'in').join(' ');
        }

        return { typeName, length, usage };
    }


    // returns false if global already exists
    protected addGlobal(name: string): boolean {
        if (!this.knownGlobals.includes(name)) {
            this.knownGlobals.push(name);
            return true;
        }
        return false;
    }


    protected addFunction(id: number): boolean {
        if (!this.knownFunctions.includes(id)) {
            this.knownFunctions.push(id);
            return true;
        }
        return false;
    }


    protected addType(name: string): boolean {
        if (!this.knownTypes.includes(name)) {
            this.knownTypes.push(name);
            return true;
        }
        return false;
    }


    protected addUav(uav: IUavReflection): boolean {
        if (!this.knownUAVs.map(u => u.name).includes(uav.name)) {
            this.knownUAVs.push(uav);
            return true;
        }
        return false;
    }


    protected addCsShader(shader: ICSShaderReflection): boolean {
        if (!this.knownCsShaders.map(s => s.name).includes(shader.name)) {
            this.knownCsShaders.push(shader);
            return true;
        }
        return false;
    }


    emitUav(type: string, name: string, comment?: string): IUavReflection {
        const register = this.knownUAVs.length;
        const regexp = /^([\w]+)<([\w0-9_]+)>$/;
        const match = type.match(regexp);
        assert(match);

        const uav: IUavReflection = {
            name,
            type,
            uavType: match[1],
            elementType: match[2],
            register
        };

        if (this.addUav(uav)) {
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitLine(`${type} ${name}: register(u${register});`);
            }
            this.end();
            return uav;
        }

        return this.knownUAVs.find(u => u.name == name);
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


    // todo: remove hack with rename mutator
    emitVariableDeclNoInit(decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = this.resolveType(decl.type);
        const name = rename ? rename(decl) : decl.name;

        if (decl.isGlobal()) {
            if (!this.addGlobal(CodeEmitter.asSTRID(decl))) {
                // do not exit here
            }
        }

        usage && this.emitKeyword(usage);
        this.emitKeyword(typeName);
        this.emitKeyword(name);
        length && this.emitChar(`[${length}]`);
        decl.semantic && this.emitSemantic(decl.semantic);
        decl.annotation && this.emitAnnotation(decl.annotation);
    }


    // todo: remove hack with rename mutator
    emitVariableDecl(src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        this.emitVariableDeclNoInit(src, rename);
        src.initExpr && (this.emitKeyword('='), this.emitSpace(), this.emitExpression(src.initExpr));
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

        if (!this.addFunction(fn.instructionID)) {
            // function already exists
            return;
        }

        const { def } = fn;
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


    emitCollector(collector: IInstructionCollector) {
        this.begin();
        for (let instr of collector.instructions) {
            this.emit(instr);
        }
        this.end();
    }


    emitTypeDecl(instr: ITypeDeclInstruction) {
        this.resolveType(instr.type);
    }


    emitTypedef(instr: ITypedefInstruction) {
        // nothing todo because current implementation implies
        // immediate target type substitution 
        return;
        /*
            this.emitKeyword('typedef');
            // todo: add support for typedefs like:
            //  typedef const float4 T;
            //          ^^^^^^^^^^^^
            this.emitKeyword(instr.type.name);
            this.emitKeyword(instr.alias);
            this.emitChar(';');
            this.emitNewline();
        */
    }


    emitForStmt(stmt: IForStmtInstruction) {

        //for(int i = 0;i < 4;++ i)
        //{
        //  ...
        //}

        this.emitKeyword('for');
        this.emitChar('(');
        this.emitNoSpace();

        this.emitStmt(stmt.init);
        this.emitNoSpace();

        this.emitExpression(stmt.cond);
        this.emitChar(';');

        this.emitExpression(stmt.step);
        this.emitChar(')');

        if (stmt.body.instructionType === EInstructionTypes.k_StmtBlock)
            this.emitNewline();
        this.emitStmt(stmt.body);
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
                this.emitLine(`/* ... unsupported expression '${expr.instructionName}' ... */`);
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
        const int = lit as IntInstruction;
        this.emitKeyword(`${int.heximal ? '0x' + int.value.toString(16).toUpperCase() : int.value.toFixed(0)}${!int.signed ? 'u' : ''}`);
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


    emitPostfixIndex(pfidx: IPostfixIndexInstruction) {
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
        params.filter(p => !this.options.omitEmptyParams || p.type.size !== 0).forEach((param, i, list) => {
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
        this.emitKeyword(asgm.operator);
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
        this.emitChar(';');
        // emit annotation?
        this.end();
    }


    emitGlobal(decl: IVariableDeclInstruction) {
        // const name = decl.name;
        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.type.isUniform();

        if (decl.isGlobal() || isUniformArg) {
            if (this.addGlobal(CodeEmitter.asSTRID(decl))) {
                if (decl.usageFlags & EVariableUsageFlags.k_Cbuffer) {
                    const cbufType = decl.parent;
                    const cbuf = <ICbufferInstruction>cbufType.parent;
                    this.begin();
                    this.emitCbuffer(cbuf);
                    this.end();
                } else {
                    this.begin();
                    this.emitStmt(decl);
                    this.end();
                }
            }
        }
    }


    emitGlobalRaw(name: string, content: string) {
        if (this.addGlobal(name)) {
            this.begin();
            this.emitChar(`${content};`);
            this.emitNewline();
            this.end();
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


    // todo: remove hack with rename mutator
    emitFCall(call: IFunctionCallInstruction, rename: (decl: IFunctionDeclInstruction) => string = decl => decl.name) {
        const { decl, args, callee } = call;

        this.emitFunction(decl);

        if (callee) {
            this.emitExpression(callee);
            this.emitChar('.');
            this.emitNoSpace();
        }
        this.emitKeyword(rename(decl));
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
            case EInstructionTypes.k_ForStmt:
                this.emitForStmt(stmt as IForStmtInstruction);
                break;
            default:
                this.emitLine(`/* ... unsupported stmt '${stmt.instructionName}' .... */`);
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
            this.emitLine('/* ... empty instruction .... */');
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
                this.emitLine(`/* ... unsupported instruction '${instr.instructionName}' .... */`);
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
