import { assert, isDef, isNull } from "@lib/common";
import { instruction } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IAnnotationInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, IBitwiseExprInstruction, ICastExprInstruction, ICbufferInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IForStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, ILogicalExprInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITypeDeclInstruction, ITypedefInstruction, ITypedInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { fn } from "@lib/fx/analisys/helpers/fn";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { EVariableUsageFlags } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { isString } from "@lib/util/s3d/type";
import { BaseEmitter } from "./BaseEmitter";


interface ITypeInfo {
    typeName: string;
    length: number;
    usage?: string;
}

export enum EUsages {
    k_Vertex = 0x01,
    k_Pixel = 0x02,
    k_Compute = 0x04
};


export interface IUavReflection {
    register: number;
    name: string;
    /** @deprecated */
    type: string;           // "RWBuffer<float4>", "AppendBuffer<int>" etc. 
    uavType: string;        // "RWBuffer"
    elementType: string;    // "float4"
};


export interface IBufferReflection {
    register: number;
    name: string;
    /** @deprecated */
    type: string;           // "Buffer<float4>", "AppendBuffer<int>" etc. 
    bufType: string;        // "Buffer"
    elementType: string;    // "float4"
}


export interface ITextureReflection {
    register: number;
    name: string;
    /** @deprecated */
    type: string;           // "Texture2D<float4>"
    texType: string;        // "Texture2D"
    elementType: string;    // "float4"
}


export interface ICSShaderReflection {
    name: string;
    numthreads: number[];
    uavs: IUavReflection[];
    buffers: IBufferReflection[];
    textures: ITextureReflection[];
}


export interface IUniformReflection {
    name: string;
    typeName: string;
    semantic?: string;
    length?: number;
}


export interface ICbReflection {
    register: number;
    name: string;
    size: number; // byte length
}

export interface ICodeEmitterOptions {
    // do not print 'in' for function parameters even if it is specified
    omitInUsage?: boolean;
    // skip complex type parameters of zero size
    omitEmptyParams?: boolean;
}


function pushUniq<T>(arr: Array<T>, elem: T) {
    if (arr.indexOf(elem) == -1)
        arr.push(elem);
}


export interface ICodeContextOptions {
    mode?: 'vertex' | 'pixel' | 'compute' | 'raw';
    // rename entry point
    entryName?: string;
}


export class CodeContext {
    // known globals like: functions, types, uniforms etc.
    private knownSignatures: Set<string> = new Set();

    readonly uavs: IUavReflection[] = [];
    readonly textures: ITextureReflection[] = [];
    readonly buffers: IBufferReflection[] = [];
    readonly cbuffers: ICbReflection[] = [];
    readonly CSShaders: ICSShaderReflection[] = [];

    protected CSShader?: ICSShaderReflection;

    readonly opts: ICodeContextOptions;

    constructor(opts: ICodeContextOptions = {}) {
        this.opts = opts;
        this.opts.mode ||= 'raw';
    }

    get entryName(): string { return this.opts.entryName; }
    get mode(): string { return this.opts.mode; }
    isPixel() { return this.mode === 'pixel'; }
    isVertex() { return this.mode === 'vertex'; }
    isRaw() { return this.mode === 'raw'; }


    has(signature: string): boolean {
        return this.knownSignatures.has(signature);
    }


    add(signature: string): void {
        assert(!this.has(signature));
        this.knownSignatures.add(signature);
    }


    // note: cbuffers without predefined register are not supported yet (!)
    addCbuffer(cbuf: ICbufferInstruction): ICbReflection {
        assert(!this.has(cbuf.name));
        this.add(cbuf.name);

        const { name, type: { size }, register: { index: register } } = cbuf;
        const buf = { name, size, register };
        this.cbuffers.push(buf);

        return buf;
    }


    addTexture(type: string, name: string): ITextureReflection {
        assert(!this.has(name));
        this.add(name);

        const register = this.buffers.length + this.textures.length;
        const regexp = /^([\w]+)<([\w0-9_]+)>$/;
        const match = type.match(regexp) || [ `${type}<float4>`, `${type}`, `float4` ];
        const texture = <ITextureReflection>{
            name,
            type,
            texType: match[1],
            elementType: match[2],
            register
        };

        this.textures.push(texture);
        return texture;
    }


    addUav(type: string, name: string): IUavReflection {
        assert(!this.has(name));
        this.add(name);

        const register = this.uavs.length;
        const regexp = /^([\w]+)<([\w0-9_]+)>$/;
        const match = type.match(regexp);
        assert(match);
        const uav = {
            name,
            type,
            uavType: match[1],
            elementType: match[2],
            register
        };

        this.uavs.push(uav);
        return uav;
    }



    addBuffer(type: string, name: string): IBufferReflection {
        assert(!this.has(name));
        this.add(name);

        const register = this.buffers.length + this.textures.length;
        const regexp = /^([\w]+)<([\w0-9_]+)>$/;
        const match = type.match(regexp);
        assert(match);

        const buf = {
            name,
            type,
            bufType: match[1],
            elementType: match[2],
            register
        };

        this.buffers.push(buf);
        return buf;
    }


    beginCsShader(name: string, numthreads: number[]) {
        const uavs = [];
        const buffers = [];
        const textures = [];
        this.CSShader = { name, numthreads, uavs, buffers, textures };
    }


    endCsShader() {
        const sh = this.CSShader;
        assert(sh);
        assert(!this.has(sh.name));
        this.add(sh.name);
        this.CSShaders.push(sh);

        this.CSShader = null;
    }


    linkBuffer(name: string) {
        assert(this.has(name));
        // push if not exists
        let sh = this.CSShader;
        if (sh) {
            pushUniq(sh.buffers, this.buffers.find(b => b.name == name));
        }
    }


    linkCbuffer(name: string) {
        assert(this.has(name));
        // push if not exists
        let sh = this.CSShader;
        if (sh) {
            // pushUniq(sh.cbuffers, this.cbuffers.find(b => b.name == name));
        }
    }


    linkUav(name: string) {
        assert(this.has(name));
        // push if not exists
        let sh = this.CSShader;
        if (sh) {
            pushUniq(sh.uavs, this.uavs.find(u => u.name == name));
        }
    }

    linkTexture(name: string) {
        assert(this.has(name));
        // push if not exists
        let sh = this.CSShader;
        if (sh) {
            pushUniq(sh.textures, this.textures.find(t => t.name == name));
        }
    }
}

export class CodeEmitter<ContextT extends CodeContext> extends BaseEmitter {
    constructor(protected options: ICodeEmitterOptions = {}) {
        super();
    }


    protected isMain() {
        return this.depth() === 1;
    }


    protected resolveTypeName(type: ITypeInstruction): string {
        return type.name;
    }


    protected resolveType(ctx: ContextT, type: ITypeInstruction): ITypeInfo {
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
            // find original type instead of VariableType wrapper. 
            const originalType = type.scope.findType(type.name);
            this.emit(ctx, originalType);
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


    emitBuffer(ctx: ContextT, type: string, name: string, comment?: string): void {
        if (!ctx.has(name)) {
            const buf = ctx.addBuffer(type, name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitKeyword(`${type} ${name}: register(t${buf.register});`);
            }
            this.end();
        }
        ctx.linkBuffer(name);
    }


    emitUav(ctx: ContextT, type: string, name: string, comment?: string): void {
        if (!ctx.has(name)) {
            const uav = ctx.addUav(type, name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitKeyword(`${type} ${name}: register(u${uav.register});`);
            }
            this.end();
        }
        ctx.linkUav(name);
    }



    emitTexture(ctx: ContextT, decl: IVariableDeclInstruction) {
        const { name, type } = decl;
        this.emitTextureRaw(ctx, type.name, name);
    }



    emitTextureRaw(ctx: ContextT, type: string, name: string, comment?: string): void {
        if (!ctx.has(name)) {
            const tex = ctx.addTexture(type, name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitKeyword(`${type} ${name}: register(t${tex.register});`);
            }
            this.end();
        }
        ctx.linkTexture(name);
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


    emitComplexType(ctx: ContextT, type: ITypeInstruction) {
        assert(type.isComplex());
        this.emitKeyword('struct');
        this.emitKeyword(type.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();

        type.fields.map(field => (this.emitComplexField(ctx, field), this.emitNewline()));

        this.pop();
        this.emitChar('}');
    }


    emitComplexTypeDecl(ctx: ContextT, ctype: ITypeInstruction) {
        if (ctx.has(ctype.name)) {
            return;
        }

        ctx.add(ctype.name);

        this.begin();
        this.emitComplexType(ctx, ctype);
        this.emitChar(';');
        this.end();
    }

    // todo: remove hack with rename mutator
    emitVariableNoInit(ctx: ContextT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = this.resolveType(ctx, decl.type);
        const name = rename ? rename(decl) : decl.name;

        usage && this.emitKeyword(usage);
        this.emitKeyword(typeName);
        this.emitKeyword(name);
        length && this.emitChar(`[${length}]`);
        decl.semantic && this.emitSemantic(ctx, decl.semantic);
        decl.annotation && this.emitAnnotation(ctx, decl.annotation);
    }


    // todo: remove hack with rename mutator
    emitVariable(ctx: ContextT, src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        this.emitVariableNoInit(ctx, src, rename);
        if (src.initExpr) {
            this.emitKeyword('='), this.emitSpace(), this.emitExpression(ctx, src.initExpr);
        }
    }


    emitIfStmt(ctx: ContextT, stmt: IIfStmtInstruction): void {
        this.emitKeyword('if');
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(ctx, stmt.cond);
        this.emitChar(')');
        this.emitNewline();

        if (stmt.conseq) {
            this.emitStmt(ctx, stmt.conseq);
        } else {
            this.emitChar(';');
        }

        if (stmt.contrary) {
            this.emitNewline();
            this.emitKeyword('else');
            this.emitStmt(ctx, stmt.contrary);
        }
    }


    emitSemantic(ctx: ContextT, semantic: string) {
        this.emitChar(':');
        this.emitKeyword(semantic);
    }


    emitAnnotation(ctx: ContextT, anno: IAnnotationInstruction) {
        // TODO: add annotation emission.
    }


    emitCompile(ctx: ContextT, compile: ICompileExprInstruction) {
        this.emitFunction(ctx, compile.function);

        this.emitKeyword('compile');
        this.emitKeyword(compile.function.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(ctx, compile.args);
        this.emitChar(')');
    }


    protected evaluateEntryName(ctx: ContextT, fn: IFunctionDeclInstruction) {
        const fnName = fn.name;
        const entryName = ctx.entryName;
        if (!isString(entryName)) return fnName;
        if (isDef(fn.scope.functions[entryName]))
            // todo: emit correct error
            console.error('entry point already exists');
        return entryName;
    }


    // todo: add compute entry support
    protected emitEntryFunction(ctx: ContextT, fn: IFunctionDeclInstruction) {
        const { def } = fn;
        const { typeName } = this.resolveType(ctx, def.returnType);

        this.begin();
        {
            // in case of hlsl materials it's typical to swap arbitrary name for bundle name
            // to simplify further compilation
            let fnName = this.evaluateEntryName(ctx, fn);
            this.emitKeyword(typeName);
            this.emitKeyword(fnName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitParams(ctx, def.params);
            this.emitChar(')');

            // todo: validate complex type sematics
            // all the output parameters of entry function must have valid semantics
            if (!def.returnType.isComplex()) {
                if (ctx.isPixel()) {
                    this.emitChar(':');
                    this.emitKeyword(fn.semantic || 'SV_Target0');
                }
            }
            this.emitNewline();
            this.emitBlock(ctx, fn.impl);
        }
        this.end();
    }


    protected emitRegularFunction(ctx: ContextT, fn: IFunctionDeclInstruction) {
        if (!fn) {
            return;
        }

        const { def } = fn;
        const { typeName } = this.resolveType(ctx, def.returnType);

        this.begin();
        {
            this.emitKeyword(typeName);
            this.emitKeyword(fn.name);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitParams(ctx, def.params);
            this.emitChar(')');
            this.emitNewline();
            this.emitBlock(ctx, fn.impl);
        }
        this.end();
    }


    emitFunction(ctx: ContextT, decl: IFunctionDeclInstruction) {
        if (!decl) {
            return;
        }

        const sign = fn.signature(decl.def);
        if (ctx.has(sign)) {
            return;
        }

        ctx.add(sign);

        const isEntry = (this.depth() == 0) && !ctx.isRaw();
        if (isEntry) this.emitEntryFunction(ctx, decl);
        else this.emitRegularFunction(ctx, decl);
    }


    emitCollector(ctx: ContextT, collector: IInstructionCollector) {
        this.begin();
        for (let instr of collector.instructions) {
            this.emit(ctx, instr);
        }
        this.end();
    }


    emitTypeDecl(ctx: ContextT, decl: ITypeDeclInstruction) {
        this.resolveType(ctx, decl.type);
    }


    emitTypedef(ctx: ContextT, def: ITypedefInstruction) {
        // nothing todo because current implementation implies
        // immediate target type substitution 
        return;
        /*
            this.emitKeyword('typedef');
            // todo: add support for typedefs like:
            //  typedef const float4 T;
            //          ^^^^^^^^^^^^
            this.emitKeyword(def.type.name);
            this.emitKeyword(def.alias);
            this.emitChar(';');
            this.emitNewline();
        */
    }

    emitForInit(ctx: ContextT, init: ITypedInstruction) {
        if (instruction.isExpression(init)) {
            this.emitExpression(ctx, init as IExprInstruction);
        } else {
            this.emitVariable(ctx, init as IVariableDeclInstruction);
        }
    }

    emitForStmt(ctx: ContextT, stmt: IForStmtInstruction) {

        //for(int i = 0;i < 4;++ i)
        //{
        //  ...
        //}

        this.emitKeyword('for');
        this.emitChar('(');
        this.emitNoSpace();

        this.emitForInit(ctx, stmt.init);
        this.emitChar(';');

        this.emitExpression(ctx, stmt.cond);
        this.emitChar(';');

        this.emitExpression(ctx, stmt.step);
        this.emitChar(')');

        if (stmt.body.instructionType === EInstructionTypes.k_StmtBlock)
            this.emitNewline();
        this.emitStmt(ctx, stmt.body);
    }


    emitExpression(ctx: ContextT, expr: IExprInstruction) {
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
                return this.emitArithmetic(ctx, expr as IArithmeticExprInstruction);
            case EInstructionTypes.k_AssignmentExpr:
                return this.emitAssigment(ctx, expr as IAssignmentExprInstruction);
            case EInstructionTypes.k_PostfixPointExpr:
                return this.emitPostfixPoint(ctx, expr as IPostfixPointInstruction);
            case EInstructionTypes.k_IdExpr:
                return this.emitIdentifier(ctx, expr as IIdExprInstruction);
            case EInstructionTypes.k_FunctionCallExpr:
                return this.emitFCall(ctx, expr as IFunctionCallInstruction);
            case EInstructionTypes.k_ConstructorCallExpr:
                return this.emitCCall(ctx, expr as IConstructorCallInstruction);
            case EInstructionTypes.k_FloatExpr:
                return this.emitFloat(ctx, expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_IntExpr:
                return this.emitInteger(ctx, expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_BoolExpr:
                return this.emitBool(ctx, expr as ILiteralInstruction<boolean>);
            case EInstructionTypes.k_ComplexExpr:
                return this.emitComplexExpr(ctx, expr as IComplexExprInstruction);
            case EInstructionTypes.k_CompileExpr:
                return this.emitCompile(ctx, expr as ICompileExprInstruction);
            case EInstructionTypes.k_ConditionalExpr:
                return this.emitConditionalExpr(ctx, expr as IConditionalExprInstruction);
            case EInstructionTypes.k_RelationalExpr:
                return this.emitRelationalExpr(ctx, expr as IRelationalExprInstruction);
            case EInstructionTypes.k_LogicalExpr:
                return this.emitLogicalExpr(ctx, expr as ILogicalExprInstruction);
            case EInstructionTypes.k_UnaryExpr:
                return this.emitUnaryExpr(ctx, expr as IUnaryExprInstruction);
            case EInstructionTypes.k_PostfixArithmeticExpr:
                return this.emitPostfixArithmetic(ctx, expr as IPostfixArithmeticInstruction);
            case EInstructionTypes.k_InitExpr:
                return this.emitInitExpr(ctx, expr as IInitExprInstruction);
            case EInstructionTypes.k_CastExpr:
                return this.emitCast(ctx, expr as ICastExprInstruction);
            case EInstructionTypes.k_BitwiseExpr:
                return this.emitBitwise(ctx, expr as IBitwiseExprInstruction);
            case EInstructionTypes.k_PostfixIndexExpr:
                return this.emitPostfixIndex(ctx, expr as IPostfixIndexInstruction);
            default:
                this.emitLine(`/* ... unsupported expression '${expr.instructionName}' ... */`);
                assert(false, `unsupported instruction found: ${expr.instructionName}`);
        }
    }


    emitFloat(ctx: ContextT, lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.');
        this.emitChar('f');
    }


    emitBool(ctx: ContextT, lit: ILiteralInstruction<boolean>) {
        this.emitKeyword(lit.value ? 'true' : 'false');
    }


    emitComplexExpr(ctx: ContextT, complex: IComplexExprInstruction) {
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(ctx, complex.expr);
        this.emitChar(')');
    }


    emitConditionalExpr(ctx: ContextT, cond: IConditionalExprInstruction) {
        this.emitExpression(ctx, cond.condition);
        this.emitKeyword('?');
        this.emitExpression(ctx, cond.left as IExprInstruction);
        this.emitKeyword(':');
        this.emitExpression(ctx, cond.right as IExprInstruction);
    }


    emitInteger(ctx: ContextT, lit: ILiteralInstruction<number>) {
        const int = lit as IntInstruction;
        this.emitKeyword(`${int.heximal ? '0x' + int.value.toString(16).toUpperCase() : int.value.toFixed(0)}${!int.signed ? 'u' : ''}`);
    }


    emitRelationalExpr(ctx: ContextT, rel: IRelationalExprInstruction) {
        this.emitExpression(ctx, rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(ctx, rel.right);
    }


    emitLogicalExpr(ctx: ContextT, rel: ILogicalExprInstruction) {
        this.emitExpression(ctx, rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(ctx, rel.right);
    }


    emitUnaryExpr(ctx: ContextT, unary: IUnaryExprInstruction) {
        this.emitChar(unary.operator);
        this.emitExpression(ctx, unary.expr);
    }


    emitPostfixArithmetic(ctx: ContextT, par: IPostfixArithmeticInstruction) {
        this.emitExpression(ctx, par.expr);
        this.emitChar(par.operator);
    }


    emitPostfixIndex(ctx: ContextT, pfidx: IPostfixIndexInstruction) {
        this.emitExpression(ctx, pfidx.element);
        this.emitChar('[');
        this.emitNoSpace();
        this.emitExpression(ctx, pfidx.index);
        this.emitChar(']');
    }


    emitExpressionList(ctx: ContextT, list: IExprInstruction[]) {
        (list || []).forEach((expr, i) => {
            this.emitExpression(ctx, expr);
            (i != list.length - 1) && this.emitChar(',');
        })
    }


    emitParam(ctx: ContextT, param: IVariableDeclInstruction) {
        this.emitVariable(ctx, param);
    }


    emitParams(ctx: ContextT, params: IVariableDeclInstruction[]) {
        params.filter(p => !this.options.omitEmptyParams || p.type.size !== 0).forEach((param, i, list) => {
            this.emitParam(ctx, param);
            (i + 1 != list.length) && this.emitChar(',');
        });
    }


    emitInitExpr(ctx: ContextT, init: IInitExprInstruction) {
        if (init.args.length > 1) {
            this.emitChar('{');
            this.emitNoSpace();
            this.emitExpressionList(ctx, init.args);
            this.emitChar('}');
            return;
        }

        this.emitExpression(ctx, init.args[0]);
    }


    emitCast(ctx: ContextT, cast: ICastExprInstruction) {
        if (cast.isUseless()) {
            return;
        }

        this.emitChar('(');
        this.emitNoSpace();

        const { typeName } = this.resolveType(ctx, cast.type);
        this.emitKeyword(typeName);

        this.emitChar(')');
        this.emitNoSpace();
        this.emitExpression(ctx, cast.expr);
    }


    emitBitwise(ctx: ContextT, bwise: IBitwiseExprInstruction) {
        this.emitExpression(ctx, bwise.left);
        this.emitKeyword(bwise.operator);
        this.emitSpace();
        this.emitExpression(ctx, bwise.right);
    }


    emitArithmetic(ctx: ContextT, arthm: IArithmeticExprInstruction) {
        this.emitExpression(ctx, arthm.left);
        this.emitKeyword(arthm.operator);
        this.emitSpace();
        this.emitExpression(ctx, arthm.right);
    }


    emitAssigment(ctx: ContextT, asgm: IAssignmentExprInstruction) {
        this.emitExpression(ctx, asgm.left);
        this.emitKeyword(asgm.operator);
        this.emitSpace();
        assert(instruction.isExpression(asgm.right));
        this.emitExpression(ctx, asgm.right as IExprInstruction);
    }


    emitPostfixPoint(ctx: ContextT, pfxp: IPostfixPointInstruction) {
        // todo: skip brackets wherever possible to avoid exprs like (a).x;
        if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr ||
            pfxp.element.instructionType === EInstructionTypes.k_PostfixPointExpr) {
            this.emitExpression(ctx, pfxp.element);
        } else {
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpression(ctx, pfxp.element);
            this.emitChar(')');
        }
        this.emitChar('.');
        this.emitChar(pfxp.postfix.name);
    }


    emitCbufferField(ctx: ContextT, field: IVariableDeclInstruction) {
        this.emitVariable(ctx, field);
        this.emitChar(';');
        this.emitChar('\t')
        this.emitComment(`padding ${field.type.padding}, size ${field.type.size}`);
    }


    emitCbuffer(ctx: ContextT, cbuf: ICbufferInstruction) {
        if (!ctx.has(cbuf.name)) {
            ctx.addCbuffer(cbuf);

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
                    this.emitCbufferField(ctx, field);
                });
            }
            this.pop();
            this.emitChar('}');
            this.emitChar(';');
            // emit annotation?
            this.end();
        }
        ctx.linkCbuffer(cbuf.name);
    }


    // request global declaration for local identifier
    emitGlobal(ctx: ContextT, decl: IVariableDeclInstruction) {
        // const name = decl.name;
        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.type.isUniform();

        // if (decl.type.isUniform())
        // console.log(decl.toCode());

        const { name, type } = decl;

        if (decl.isGlobal() || isUniformArg) {
            if (decl.usageFlags & EVariableUsageFlags.k_Cbuffer) {
                const cbufType = decl.parent;
                const cbuf = <ICbufferInstruction>cbufType.parent;
                this.begin();
                this.emitCbuffer(ctx, cbuf);
                this.end();
            } else if (type.isTexture()) {
                this.begin();
                this.emitTexture(ctx, decl);
                this.end();
            } else {
                this.begin();
                this.emitGlobalVariable(ctx, decl);
                this.end();
            }
        }
    }


    emitIdentifier(ctx: ContextT, id: IIdExprInstruction) {
        const { decl, name } = id;

        this.emitGlobal(ctx, decl);
        this.emitKeyword(name);
    }


    emitCCall(ctx: ContextT, call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = this.resolveType(ctx, call.ctor);

        this.emitKeyword(typeName);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(ctx, args);
        this.emitChar(')');
    }


    // todo: remove hack with rename mutator
    emitFCall(ctx: ContextT, call: IFunctionCallInstruction, rename: (decl: IFunctionDeclInstruction) => string = decl => decl.name) {
        const { decl, args, callee } = call;

        if (decl.instructionType !== EInstructionTypes.k_SystemFunctionDecl) {
            this.emitFunction(ctx, decl);
        }

        if (callee) {
            this.emitExpression(ctx, callee);
            this.emitChar('.');
            this.emitNoSpace();
        }
        this.emitKeyword(rename(decl));
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(ctx, args);
        this.emitChar(')');
    }


    emitReturnStmt(ctx: ContextT, stmt: IReturnStmtInstruction) {
        this.emitKeyword('return');
        this.emitSpace();
        this.emitExpression(ctx, stmt.expr);
        this.emitChar(';');
    }


    emitExpressionStmt(ctx: ContextT, stmt: IExprStmtInstruction) {
        this.emitExpression(ctx, stmt.expr);
        this.emitChar(';');
    }


    emitLocalVariable(ctx: ContextT, stmt: IVariableDeclInstruction) {
        this.emitVariable(ctx, stmt);
        this.emitChar(';');
    }


    emitGlobalVariable(ctx: ContextT, decl: IVariableDeclInstruction) {
        if (ctx.has(decl.name)) {
            return;
        }

        ctx.add(decl.name);

        this.begin();
        this.emitVariable(ctx, decl);
        this.emitChar(';');
        this.end();
    }


    emitComplexField(ctx: ContextT, instr: IVariableDeclInstruction) {
        console.assert(instr.instructionType === EInstructionTypes.k_VariableDecl);

        this.emitVariable(ctx, instr);
        this.emitChar(';');
    }


    emitDeclStmt(ctx: ContextT, stmt: IDeclStmtInstruction) {
        stmt.declList.forEach(decl => {
            console.assert(decl.instructionType === EInstructionTypes.k_VariableDecl);
            this.emitLocalVariable(ctx, decl as IVariableDeclInstruction);
        });
    }


    /*
        | IStmtBlockInstruction
        | IWhileStmtInstruction
        | IForStmtInstruction;
    */
    emitStmt(ctx: ContextT, stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_DeclStmt:
                this.emitDeclStmt(ctx, stmt as IDeclStmtInstruction);
                break;
            case EInstructionTypes.k_ExprStmt:
                this.emitExpressionStmt(ctx, stmt as IExprStmtInstruction);
                break;
            case EInstructionTypes.k_ReturnStmt:
                this.emitReturnStmt(ctx, stmt as IReturnStmtInstruction);
                break;
            case EInstructionTypes.k_SemicolonStmt:
                this.emitChar(';');
                break;
            case EInstructionTypes.k_IfStmt:
                this.emitIfStmt(ctx, stmt as IIfStmtInstruction);
                break;
            case EInstructionTypes.k_StmtBlock:
                this.emitBlock(ctx, stmt as IStmtBlockInstruction);
                break;
            case EInstructionTypes.k_ForStmt:
                this.emitForStmt(ctx, stmt as IForStmtInstruction);
                break;
            default:
                this.emitLine(`/* ... unsupported stmt '${stmt.instructionName}' .... */`);
                console.warn(`unknown stmt found: '${stmt.instructionName}'`);
        }
    }


    emitBlock(ctx: ContextT, blk: IStmtBlockInstruction) {
        // if (!blk.stmtList.length)
        // {
        //     this.emitChar(';');
        //     return;
        // }

        this.emitChar('{');
        this.push();
        blk.stmtList.forEach(stmt => (this.emitStmt(ctx, stmt), this.emitNewline()));
        this.pop();
        this.emitChar('}');
    }


    emitPass(ctx: ContextT, pass: IPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        this.emitPassBody(ctx, pass);
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitPassBody(ctx: ContextT, pass: IPassInstruction) {
        // TODO: replace with emitCompile();
        if (pass.vertexShader) {
            this.emitFunction(ctx, pass.vertexShader);

            this.emitKeyword('VertexShader');
            this.emitKeyword('=');
            this.emitKeyword('compile');
            this.emitKeyword(pass.vertexShader.name);
            this.emitChar('()');
            this.emitChar(';');
            this.emitNewline();
        }

        if (pass.pixelShader) {
            this.emitFunction(ctx, pass.pixelShader);

            this.emitKeyword('PixelShader');
            this.emitKeyword('=');
            this.emitKeyword('compile');
            this.emitKeyword(pass.pixelShader.name);
            this.emitChar('()');
            this.emitChar(';');
            this.emitNewline();
        }

        if (pass.renderStates) {
            for (let key in pass.renderStates) {
                const state = pass.renderStates[key];
                if (state != ERenderStateValues.UNDEF) {
                    this.emitKeyword(ERenderStates[Number(key)]);
                    this.emitChar('=');
                    this.emitKeyword(ERenderStateValues[state]);
                    this.emitChar(';');
                    this.emitNewline();
                }
            }
        }

        this.emitNewline();

        // mwalk(pass.renderStates, (val, key) => {
        //     console.log(ERenderStates[key], ERenderStateValues[val]);
        // });
    }


    emit(ctx: ContextT, instr: IInstruction): CodeEmitter<ContextT> {
        if (!instr) {
            // TODO: emit error.
            this.emitLine('/* ... empty instruction .... */');
            return this;
        }

        if (instruction.isExpression(instr)) {
            this.emitExpression(ctx, instr as IExprInstruction);
            return this;
        }

        if (instruction.isStatement(instr)) {
            this.emitStmt(ctx, instr);
            return this;
        }

        //
        // Other types
        //

        switch (instr.instructionType) {
            case EInstructionTypes.k_FunctionDecl:
                this.emitFunction(ctx, instr as IFunctionDeclInstruction);
                break;
            case EInstructionTypes.k_CbufferDecl:
                this.emitCbuffer(ctx, instr as ICbufferInstruction);
                break;
            case EInstructionTypes.k_VariableDecl:
                this.emitGlobalVariable(ctx, instr as IVariableDeclInstruction);
                break;
            case EInstructionTypes.k_Collector:
                this.emitCollector(ctx, instr as IInstructionCollector);
                break;
            case EInstructionTypes.k_TypeDecl:
                this.emitTypeDecl(ctx, instr as ITypeDeclInstruction);
                break;
            case EInstructionTypes.k_TypedefDecl:
                this.emitTypedef(ctx, instr as ITypedefInstruction);
                break;
            case EInstructionTypes.k_ComplexType:
            case EInstructionTypes.k_VariableType:
                // todo: addComplexType ?
                this.emitComplexTypeDecl(ctx, instr as ITypeInstruction);
                break;
            default:
                this.emitLine(`/* ... unsupported instruction '${instr.instructionName}' .... */`);
                assert(false, `unsupported instruction found: ${instr.instructionName}`);
        }

        return this;
    }


    private static cEmitter = new CodeEmitter({ omitEmptyParams: true });

    static translate(instr: IInstruction, ctx: CodeContext = new CodeContext): string {
        return CodeEmitter.cEmitter.emit(ctx, instr).toString();
    }

    static translateDocument(document: ISLDocument, ctx: CodeContext = new CodeContext): string {
        if (isNull(document)) {
            return '';
        }

        if (isNull(document.root)) {
            return '';
        }

        return CodeEmitter.translate(document.root, ctx);
    }

}

