import { assert, isDef, isNull } from "@lib/common";
import { instruction } from "@lib/fx/analisys/helpers";
import { EInstructionTypes, IAnnotationInstruction, IArithmeticExprInstruction, IAssignmentExprInstruction, IBitwiseExprInstruction, ICastExprInstruction, ICbufferInstruction, ICompileExprInstruction, IComplexExprInstruction, IConditionalExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprInstruction, IExprStmtInstruction, IForStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, ILogicalExprInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IReturnStmtInstruction, IStmtBlockInstruction, ITypeDeclInstruction, ITypedefInstruction, ITypedInstruction, ITypeInstruction, IUnaryExprInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { fn } from "@lib/fx/analisys/helpers/fn";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { EVariableUsageFlags } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { isString } from "@lib/util/s3d/type";
import { BaseEmitter } from "./BaseEmitter";
import { IDrawOpReflection } from "./FxTranslator";

export interface IConvolutionPack {
    textDocument?: ITextDocument;
    slastDocument?: ISLASTDocument;
}

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
    // trimeshes: ITrimeshReflection[];
}


export interface ICbReflection {
    register: number;
    name: string;
    size: number; // byte length
}

export interface ICodeEmitterOptions {
    mode?: 'vertex' | 'pixel' | 'compute' | 'raw';
    // do not print 'in' for function parameters even if it is specified
    omitInUsage?: boolean;
    // skip complex type parameters of zero size
    omitEmptyParams?: boolean;

    // rename entry point
    entryName?: string;
}

export interface ICodeReflectionContext {
    shader?: ICSShaderReflection;
    dop?: IDrawOpReflection; // draw operator
}

function pushUniq<T>(arr: Array<T>, elem: T)
{
    if (arr.indexOf(elem) == -1)
        arr.push(elem);
}

export class CodeReflection<ContextT extends ICodeReflectionContext = ICodeReflectionContext> {
    /*protected*/ globals: string[] = [];
    /*protected*/ types: string[] = [];
    /*protected*/ functions: string[] = []; // signatures
    /*protected*/ uniforms: string[] = [];
    /*protected*/ uavs: IUavReflection[] = [];
    /*protected*/ buffers: IBufferReflection[] = [];
    /*protected*/ cbuffers: ICbReflection[] = [];
    /*protected*/ CSShaders: ICSShaderReflection[] = [];

    protected ctx = <ContextT>{}

    checkGlobal(name: string): string {
        return this.globals.find(g => g == name);
    }


    // returns false if global already exists
    addGlobal(name: string): boolean {
        let g = this.checkGlobal(name);
        if (!g) {
            g = name;
            this.globals.push(g);
            return true;
        }
        return false;
    }


    checkFunction(decl: IFunctionDeclInstruction): boolean {
        const sign = fn.signature(decl.def);
        return this.functions.includes(sign);
    }


    addFunction(decl: IFunctionDeclInstruction): boolean {
        if (!this.checkFunction(decl)) {
            this.functions.push(fn.signature(decl.def));
            return true;
        }
        return false;
    }


    checkCbuffer(name: string): ICbReflection {
        return this.cbuffers.find(cb => cb.name == name);
    }


    addCbuffer(cbuf: ICbufferInstruction): boolean {
        let buf = this.checkCbuffer(cbuf.name);
        let added = !buf;
        if (!buf) {
            const { name, type: { size }, register: { index: register } } = cbuf;
            buf = { name, size, register };
            this.cbuffers.push(buf);
        }

        // push if not exists
        let sh = this.ctx.shader;
        if (sh) {
            // pushUniq(sh.cbuffers, buf);
        }

        return added;
    }


    checkType(name: string): boolean {
        return this.types.includes(name);
    }
    

    addType(name: string): boolean {
        if (!this.checkType(name)) {
            this.types.push(name);
            return true;
        }
        return false;
    }


    checkUav(name: string): IUavReflection {
        return this.uavs?.find(u => u.name == name);
    }


    addUav(type: string, name: string): boolean {
        let uav = this.checkUav(name);
        let added = !uav;
        if (!uav) {
            const register = this.uavs.length;
            const regexp = /^([\w]+)<([\w0-9_]+)>$/;
            const match = type.match(regexp);
            assert(match);
            uav = {
                name,
                type,
                uavType: match[1],
                elementType: match[2],
                register
            };

            this.uavs.push(uav);
        }

        // push if not exists
        let sh = this.ctx.shader;
        if (sh) {
            pushUniq(sh.uavs, uav);
        }

        return added;
    }


    checkBuffer(name: string): IBufferReflection {
        return this.buffers.find(b => b.name == name);
    }


    addBuffer(type: string, name: string): boolean {
        let buf = this.checkBuffer(name);
        let added = !buf;
        if (!buf) {
            const register = this.buffers.length;
            const regexp = /^([\w]+)<([\w0-9_]+)>$/;
            const match = type.match(regexp);
            assert(match);

            buf = {
                name,
                type,
                bufType: match[1],
                elementType: match[2],
                register
            };

            this.buffers.push(buf);
        }

        // push if not exists
        let sh = this.ctx.shader;
        if (sh) {
            pushUniq(sh.buffers, buf);
        }

        return added;
    }


    checkCsShader(name: string): ICSShaderReflection {
        return this.CSShaders.find(s => s.name == name);
    }


    protected addCsShader(shader: ICSShaderReflection): boolean {
        let cs = this.checkCsShader(shader.name);
        if (!cs) {
            cs = shader;
            this.CSShaders.push(cs);
            return true;
        }
        return false;
    }

    beginCsShader(name: string, numthreads: number[]) {
        const uavs = [];
        const buffers = [];
        const textures = [];
        this.ctx.shader = { name, numthreads, uavs, buffers, textures };
    }


    endCsShader() {
        assert(this.ctx.shader);
        this.addCsShader(this.ctx.shader);
        this.ctx.shader = null;
    }

    static asSTRID = (decl: IVariableDeclInstruction) => `${decl.name}${decl.instructionID}`;
}

export class CodeEmitter<CodeReflectionT extends CodeReflection> extends BaseEmitter {

    // list of convolute includes
    protected includeDeps: string[] = [];

    protected options: ICodeEmitterOptions;

    constructor(options: ICodeEmitterOptions = {}) {
        super();
        this.options = options;
        this.options.mode ||= 'raw';
    }



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


    protected isRaw() {
        return this.mode === 'raw';
    }


    protected resolveTypeName(type: ITypeInstruction): string {
        return type.name;
    }


    protected resolveType(cref: CodeReflectionT, type: ITypeInstruction): ITypeInfo {
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

            if (cref.addType(typeName)) {
                // find original type instead of VariableType wrapper. 
                const originalType = type.scope.findType(type.name);
                this.emit(cref, originalType);
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


    emitBuffer(cref: CodeReflectionT, type: string, name: string, comment?: string): IBufferReflection {
        let buf = cref.checkBuffer(name);
        if (cref.addBuffer(type, name)) {
            buf = cref.checkBuffer(name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitLine(`${type} ${name}: register(t${buf.register});`);
            }
            this.end();
        }
        return buf;
    }


    emitUav(cref: CodeReflectionT, type: string, name: string, comment?: string): IUavReflection {
        let uav = cref.checkUav(name);
        if (cref.addUav(type, name)) {
            uav = cref.checkUav(name);
            this.begin();
            {
                comment && this.emitComment(comment);
                this.emitLine(`${type} ${name}: register(u${uav.register});`);
            }
            this.end();
        }
        return uav;
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


    emitComplexType(cref: CodeReflectionT, type: ITypeInstruction) {
        assert(type.isComplex());
        this.emitKeyword('struct');
        this.emitKeyword(type.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();

        type.fields.map(field => (this.emitComplexField(cref, field), this.emitNewline()));

        this.pop();
        this.emitChar('}');
    }


    emitComplexTypeDecl(cref: CodeReflectionT, ctype: ITypeInstruction) {
        this.begin();
        this.emitComplexType(cref, ctype);
        this.emitChar(';');
        this.end();
    }

    // todo: remove hack with rename mutator
    emitVariableNoInit(cref: CodeReflectionT, decl: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        const { typeName, length, usage } = this.resolveType(cref, decl.type);
        const name = rename ? rename(decl) : decl.name;

        usage && this.emitKeyword(usage);
        this.emitKeyword(typeName);
        this.emitKeyword(name);
        length && this.emitChar(`[${length}]`);
        decl.semantic && this.emitSemantic(cref, decl.semantic);
        decl.annotation && this.emitAnnotation(cref, decl.annotation);
    }


    // todo: remove hack with rename mutator
    emitVariable(cref: CodeReflectionT, src: IVariableDeclInstruction, rename?: (decl: IVariableDeclInstruction) => string): void {
        this.emitVariableNoInit(cref, src, rename);
        if (src.initExpr) {
            this.emitKeyword('='), this.emitSpace(), this.emitExpression(cref, src.initExpr);
        }
    }


    emitIfStmt(cref: CodeReflectionT, stmt: IIfStmtInstruction): void {
        this.emitKeyword('if');
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(cref, stmt.cond);
        this.emitChar(')');
        this.emitNewline();

        if (stmt.conseq) {
            this.emitStmt(cref, stmt.conseq);
        } else {
            this.emitChar(';');
        }

        if (stmt.contrary) {
            this.emitNewline();
            this.emitKeyword('else');
            this.emitStmt(cref, stmt.contrary);
        }
    }


    emitSemantic(cref: CodeReflectionT, semantic: string) {
        this.emitChar(':');
        this.emitKeyword(semantic);
    }


    emitAnnotation(cref: CodeReflectionT, anno: IAnnotationInstruction) {
        // TODO: add annotation emission.
    }


    emitCompile(cref: CodeReflectionT, compile: ICompileExprInstruction) {
        this.emitFunction(cref, compile.function);

        this.emitKeyword('compile');
        this.emitKeyword(compile.function.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(cref, compile.args);
        this.emitChar(')');
    }


    protected evaluateEntryName(fn: IFunctionDeclInstruction) {
        const fnName = fn.name;
        const entryName = this.options.entryName;
        if (!isString(entryName)) return fnName;
        if (isDef(fn.scope.functions[entryName]))
            // todo: emit correct error
            console.error('entry point already exists');
        return entryName;
    }


    // todo: add compute entry support
    protected emitEntryFunction(cref: CodeReflectionT, fn: IFunctionDeclInstruction) {
        const { def } = fn;
        const { typeName } = this.resolveType(cref, def.returnType);

        this.begin();
        {
            // in case of hlsl materials it's typical to swap arbitrary name for bundle name
            // to simplify further compilation
            let fnName = this.evaluateEntryName(fn);
            this.emitKeyword(typeName);
            this.emitKeyword(fnName);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitParams(cref, def.params);
            this.emitChar(')');

            // todo: validate complex type sematics
            // all the output parameters of entry function must have valid semantics
            if (!def.returnType.isComplex()) {
                if (this.isPixel()) {
                    this.emitChar(':');
                    this.emitKeyword(fn.semantic || 'SV_Target0');
                }
            }
            this.emitNewline();
            this.emitBlock(cref, fn.impl);
        }
        this.end();
    }


    protected emitRegularFunction(cref: CodeReflectionT, fn: IFunctionDeclInstruction) {
        if (!fn) {
            return;
        }

        const { def } = fn;
        const { typeName } = this.resolveType(cref, def.returnType);

        this.begin();
        {
            this.emitKeyword(typeName);
            this.emitKeyword(fn.name);
            this.emitChar('(');
            this.emitNoSpace();
            this.emitParams(cref, def.params);
            this.emitChar(')');
            this.emitNewline();
            this.emitBlock(cref, fn.impl);
        }
        this.end();
    }


    emitFunction(cref: CodeReflectionT, fn: IFunctionDeclInstruction) {
        if (!fn) {
            return;
        }

        const isEntry = (this.depth() == 0) && !this.isRaw();
        if (isEntry) this.emitEntryFunction(cref, fn);
        else this.emitRegularFunction(cref, fn);
    }


    emitCollector(cref: CodeReflectionT, collector: IInstructionCollector) {
        this.begin();
        for (let instr of collector.instructions) {
            this.emit(cref, instr);
        }
        this.end();
    }


    emitTypeDecl(cref: CodeReflectionT, decl: ITypeDeclInstruction) {
        this.resolveType(cref, decl.type);
    }


    emitTypedef(cref: CodeReflectionT, def: ITypedefInstruction) {
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

    emitForInit(cref: CodeReflectionT, init: ITypedInstruction) {
        if (instruction.isExpression(init)) {
            this.emitExpression(cref, init as IExprInstruction);
        } else {
            this.emitVariable(cref, init as IVariableDeclInstruction);
        }
    }

    emitForStmt(cref: CodeReflectionT, stmt: IForStmtInstruction) {

        //for(int i = 0;i < 4;++ i)
        //{
        //  ...
        //}

        this.emitKeyword('for');
        this.emitChar('(');
        this.emitNoSpace();

        this.emitForInit(cref, stmt.init);
        this.emitChar(';');

        this.emitExpression(cref, stmt.cond);
        this.emitChar(';');

        this.emitExpression(cref, stmt.step);
        this.emitChar(')');

        if (stmt.body.instructionType === EInstructionTypes.k_StmtBlock)
            this.emitNewline();
        this.emitStmt(cref, stmt.body);
    }


    emitExpression(cref: CodeReflectionT, expr: IExprInstruction) {
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
                return this.emitArithmetic(cref, expr as IArithmeticExprInstruction);
            case EInstructionTypes.k_AssignmentExpr:
                return this.emitAssigment(cref, expr as IAssignmentExprInstruction);
            case EInstructionTypes.k_PostfixPointExpr:
                return this.emitPostfixPoint(cref, expr as IPostfixPointInstruction);
            case EInstructionTypes.k_IdExpr:
                return this.emitIdentifier(cref, expr as IIdExprInstruction);
            case EInstructionTypes.k_FunctionCallExpr:
                return this.emitFCall(cref, expr as IFunctionCallInstruction);
            case EInstructionTypes.k_ConstructorCallExpr:
                return this.emitCCall(cref, expr as IConstructorCallInstruction);
            case EInstructionTypes.k_FloatExpr:
                return this.emitFloat(cref, expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_IntExpr:
                return this.emitInteger(cref, expr as ILiteralInstruction<number>);
            case EInstructionTypes.k_BoolExpr:
                return this.emitBool(cref, expr as ILiteralInstruction<boolean>);
            case EInstructionTypes.k_ComplexExpr:
                return this.emitComplexExpr(cref, expr as IComplexExprInstruction);
            case EInstructionTypes.k_CompileExpr:
                return this.emitCompile(cref, expr as ICompileExprInstruction);
            case EInstructionTypes.k_ConditionalExpr:
                return this.emitConditionalExpr(cref, expr as IConditionalExprInstruction);
            case EInstructionTypes.k_RelationalExpr:
                return this.emitRelationalExpr(cref, expr as IRelationalExprInstruction);
            case EInstructionTypes.k_LogicalExpr:
                return this.emitLogicalExpr(cref, expr as ILogicalExprInstruction);
            case EInstructionTypes.k_UnaryExpr:
                return this.emitUnaryExpr(cref, expr as IUnaryExprInstruction);
            case EInstructionTypes.k_PostfixArithmeticExpr:
                return this.emitPostfixArithmetic(cref, expr as IPostfixArithmeticInstruction);
            case EInstructionTypes.k_InitExpr:
                return this.emitInitExpr(cref, expr as IInitExprInstruction);
            case EInstructionTypes.k_CastExpr:
                return this.emitCast(cref, expr as ICastExprInstruction);
            case EInstructionTypes.k_BitwiseExpr:
                return this.emitBitwise(cref, expr as IBitwiseExprInstruction);
            case EInstructionTypes.k_PostfixIndexExpr:
                return this.emitPostfixIndex(cref, expr as IPostfixIndexInstruction);
            default:
                this.emitLine(`/* ... unsupported expression '${expr.instructionName}' ... */`);
                assert(false, `unsupported instruction found: ${expr.instructionName}`);
        }
    }


    emitFloat(cref: CodeReflectionT, lit: ILiteralInstruction<number>) {
        const sval = String(lit.value);
        this.emitKeyword(sval);
        (sval.indexOf('.') === -1) && this.emitChar('.');
        this.emitChar('f');
    }


    emitBool(cref: CodeReflectionT, lit: ILiteralInstruction<boolean>) {
        this.emitKeyword(lit.value ? 'true' : 'false');
    }


    emitComplexExpr(cref: CodeReflectionT, complex: IComplexExprInstruction) {
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpression(cref, complex.expr);
        this.emitChar(')');
    }


    emitConditionalExpr(cref: CodeReflectionT, cond: IConditionalExprInstruction) {
        this.emitExpression(cref, cond.condition);
        this.emitKeyword('?');
        this.emitExpression(cref, cond.left as IExprInstruction);
        this.emitKeyword(':');
        this.emitExpression(cref, cond.right as IExprInstruction);
    }


    emitInteger(cref: CodeReflectionT, lit: ILiteralInstruction<number>) {
        const int = lit as IntInstruction;
        this.emitKeyword(`${int.heximal ? '0x' + int.value.toString(16).toUpperCase() : int.value.toFixed(0)}${!int.signed ? 'u' : ''}`);
    }


    emitRelationalExpr(cref: CodeReflectionT, rel: IRelationalExprInstruction) {
        this.emitExpression(cref, rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(cref, rel.right);
    }


    emitLogicalExpr(cref: CodeReflectionT, rel: ILogicalExprInstruction) {
        this.emitExpression(cref, rel.left);
        this.emitKeyword(rel.operator);
        this.emitExpression(cref, rel.right);
    }


    emitUnaryExpr(cref: CodeReflectionT, unary: IUnaryExprInstruction) {
        this.emitChar(unary.operator);
        this.emitExpression(cref, unary.expr);
    }


    emitPostfixArithmetic(cref: CodeReflectionT, par: IPostfixArithmeticInstruction) {
        this.emitExpression(cref, par.expr);
        this.emitChar(par.operator);
    }


    emitPostfixIndex(cref: CodeReflectionT, pfidx: IPostfixIndexInstruction) {
        this.emitExpression(cref, pfidx.element);
        this.emitChar('[');
        this.emitNoSpace();
        this.emitExpression(cref, pfidx.index);
        this.emitChar(']');
    }


    emitExpressionList(cref: CodeReflectionT, list: IExprInstruction[]) {
        (list || []).forEach((expr, i) => {
            this.emitExpression(cref, expr);
            (i != list.length - 1) && this.emitChar(',');
        })
    }


    emitParam(cref: CodeReflectionT, param: IVariableDeclInstruction) {
        this.emitVariable(cref, param);
    }


    emitParams(cref: CodeReflectionT, params: IVariableDeclInstruction[]) {
        params.filter(p => !this.options.omitEmptyParams || p.type.size !== 0).forEach((param, i, list) => {
            this.emitParam(cref, param);
            (i + 1 != list.length) && this.emitChar(',');
        });
    }


    emitInitExpr(cref: CodeReflectionT, init: IInitExprInstruction) {
        if (init.args.length > 1) {
            this.emitChar('{');
            this.emitNoSpace();
            this.emitExpressionList(cref, init.args);
            this.emitChar('}');
            return;
        }

        this.emitExpression(cref, init.args[0]);
    }


    emitCast(cref: CodeReflectionT, cast: ICastExprInstruction) {
        if (cast.isUseless()) {
            return;
        }

        this.emitChar('(');
        this.emitNoSpace();

        const { typeName } = this.resolveType(cref, cast.type);
        this.emitKeyword(typeName);

        this.emitChar(')');
        this.emitNoSpace();
        this.emitExpression(cref, cast.expr);
    }


    emitBitwise(cref: CodeReflectionT, bwise: IBitwiseExprInstruction) {
        this.emitExpression(cref, bwise.left);
        this.emitKeyword(bwise.operator);
        this.emitSpace();
        this.emitExpression(cref, bwise.right);
    }


    emitArithmetic(cref: CodeReflectionT, arthm: IArithmeticExprInstruction) {
        this.emitExpression(cref, arthm.left);
        this.emitKeyword(arthm.operator);
        this.emitSpace();
        this.emitExpression(cref, arthm.right);
    }


    emitAssigment(cref: CodeReflectionT, asgm: IAssignmentExprInstruction) {
        this.emitExpression(cref, asgm.left);
        this.emitKeyword(asgm.operator);
        this.emitSpace();
        assert(instruction.isExpression(asgm.right));
        this.emitExpression(cref, asgm.right as IExprInstruction);
    }


    emitPostfixPoint(cref: CodeReflectionT, pfxp: IPostfixPointInstruction) {
        // todo: skip brackets wherever possible to avoid exprs like (a).x;
        if (pfxp.element.instructionType === EInstructionTypes.k_IdExpr ||
            pfxp.element.instructionType === EInstructionTypes.k_PostfixPointExpr) {
            this.emitExpression(cref, pfxp.element);
        } else {
            this.emitChar('(');
            this.emitNoSpace();
            this.emitExpression(cref, pfxp.element);
            this.emitChar(')');
        }
        this.emitChar('.');
        this.emitChar(pfxp.postfix.name);
    }


    emitCbufferField(cref: CodeReflectionT, field: IVariableDeclInstruction) {
        this.emitVariable(cref, field);
        this.emitChar(';');
        this.emitChar('\t')
        this.emitComment(`padding ${field.type.padding}, size ${field.type.size}`);
    }


    emitCbuffer(cref: CodeReflectionT, cbuf: ICbufferInstruction) {
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
                this.emitCbufferField(cref, field);
            });
        }
        this.pop();
        this.emitChar('}');
        this.emitChar(';');
        // emit annotation?
        this.end();
    }


    // request global declaration for local identifier
    emitGlobal(cref: CodeReflectionT, decl: IVariableDeclInstruction) {
        // const name = decl.name;
        // if (isMain() && decl.isParameter() && !decl.isUniform()) {
        // TODO: add support of main arguments with basic types (attributes)
        // }

        const isUniformArg = this.isMain() && decl.isParameter() && decl.type.isUniform();

        // if (decl.type.isUniform())
        // console.log(decl.toCode());

        if (decl.isGlobal() || isUniformArg) {
            if (decl.usageFlags & EVariableUsageFlags.k_Cbuffer) {
                const cbufType = decl.parent;
                const cbuf = <ICbufferInstruction>cbufType.parent;
                if (cref.addCbuffer(cbuf)) {
                    this.begin();
                    this.emitCbuffer(cref, cbuf);
                    this.end();
                }
            } else {
                if (cref.addGlobal(CodeReflection.asSTRID(decl))) {
                    this.begin();
                    this.emitGlobalVariable(cref, decl);
                    this.end();
                }
            }
        }
    }


    emitIdentifier(cref: CodeReflectionT, id: IIdExprInstruction) {
        const { decl, name } = id;

        this.emitGlobal(cref, decl);
        this.emitKeyword(name);
    }


    emitCCall(cref: CodeReflectionT, call: IConstructorCallInstruction) {
        const args = call.args as IExprInstruction[];
        const { typeName } = this.resolveType(cref, call.ctor);

        this.emitKeyword(typeName);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(cref, args);
        this.emitChar(')');
    }


    // todo: remove hack with rename mutator
    emitFCall(cref: CodeReflectionT, call: IFunctionCallInstruction, rename: (decl: IFunctionDeclInstruction) => string = decl => decl.name) {
        const { decl, args, callee } = call;

        if (decl.instructionType !== EInstructionTypes.k_SystemFunctionDecl) {
            if (cref.addFunction(decl)) {
                this.emitFunction(cref, decl);
            }
        }

        if (callee) {
            this.emitExpression(cref, callee);
            this.emitChar('.');
            this.emitNoSpace();
        }
        this.emitKeyword(rename(decl));
        this.emitChar('(');
        this.emitNoSpace();
        this.emitExpressionList(cref, args);
        this.emitChar(')');
    }


    emitReturnStmt(cref: CodeReflectionT, stmt: IReturnStmtInstruction) {
        this.emitKeyword('return');
        this.emitSpace();
        this.emitExpression(cref, stmt.expr);
        this.emitChar(';');
    }


    emitExpressionStmt(cref: CodeReflectionT, stmt: IExprStmtInstruction) {
        this.emitExpression(cref, stmt.expr);
        this.emitChar(';');
    }


    emitLocalVariable(cref: CodeReflectionT, stmt: IVariableDeclInstruction) {
        this.emitVariable(cref, stmt);
        this.emitChar(';');
    }


    emitGlobalVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction) {
        this.begin();
        this.emitVariable(cref, decl);
        this.emitChar(';');
        this.end();
    }


    emitComplexField(cref: CodeReflectionT, instr: IVariableDeclInstruction) {
        console.assert(instr.instructionType === EInstructionTypes.k_VariableDecl);

        this.emitVariable(cref, instr);
        this.emitChar(';');
    }


    emitDeclStmt(cref: CodeReflectionT, stmt: IDeclStmtInstruction) {
        stmt.declList.forEach(decl => {
            console.assert(decl.instructionType === EInstructionTypes.k_VariableDecl);
            this.emitLocalVariable(cref, decl as IVariableDeclInstruction);
        });
    }


    /*
        | IStmtBlockInstruction
        | IWhileStmtInstruction
        | IForStmtInstruction;
    */
    emitStmt(cref: CodeReflectionT, stmt: IInstruction) {
        switch (stmt.instructionType) {
            case EInstructionTypes.k_DeclStmt:
                this.emitDeclStmt(cref, stmt as IDeclStmtInstruction);
                break;
            case EInstructionTypes.k_ExprStmt:
                this.emitExpressionStmt(cref, stmt as IExprStmtInstruction);
                break;
            case EInstructionTypes.k_ReturnStmt:
                this.emitReturnStmt(cref, stmt as IReturnStmtInstruction);
                break;
            case EInstructionTypes.k_SemicolonStmt:
                this.emitChar(';');
                break;
            case EInstructionTypes.k_IfStmt:
                this.emitIfStmt(cref, stmt as IIfStmtInstruction);
                break;
            case EInstructionTypes.k_StmtBlock:
                this.emitBlock(cref, stmt as IStmtBlockInstruction);
                break;
            case EInstructionTypes.k_ForStmt:
                this.emitForStmt(cref, stmt as IForStmtInstruction);
                break;
            default:
                this.emitLine(`/* ... unsupported stmt '${stmt.instructionName}' .... */`);
                console.warn(`unknown stmt found: '${stmt.instructionName}'`);
        }
    }


    emitBlock(cref: CodeReflectionT, blk: IStmtBlockInstruction) {
        // if (!blk.stmtList.length)
        // {
        //     this.emitChar(';');
        //     return;
        // }

        this.emitChar('{');
        this.push();
        blk.stmtList.forEach(stmt => (this.emitStmt(cref, stmt), this.emitNewline()));
        this.pop();
        this.emitChar('}');
    }


    emitPass(cref: CodeReflectionT, pass: IPassInstruction) {
        this.emitKeyword('pass');
        pass.name && this.emitKeyword(pass.name);
        this.emitNewline();
        this.emitChar('{');
        this.push();
        this.emitPassBody(cref, pass);
        this.pop();
        this.emitChar('}');
        this.emitNewline();
    }


    emitPassBody(cref: CodeReflectionT, pass: IPassInstruction) {
        // TODO: replace with emitCompile();
        if (pass.vertexShader) {
            if (cref.addFunction(pass.vertexShader)) {
                this.emitFunction(cref, pass.vertexShader);
            }

            this.emitKeyword('VertexShader');
            this.emitKeyword('=');
            this.emitKeyword('compile');
            this.emitKeyword(pass.vertexShader.name);
            this.emitChar('()');
            this.emitChar(';');
            this.emitNewline();
        }

        if (pass.pixelShader) {
            if (cref.addFunction(pass.pixelShader)) {
                this.emitFunction(cref, pass.pixelShader);
            }

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


    emit(cref: CodeReflectionT, instr: IInstruction): CodeEmitter<CodeReflectionT> {
        if (!instr) {
            // TODO: emit error.
            this.emitLine('/* ... empty instruction .... */');
            return this;
        }

        if (instruction.isExpression(instr)) {
            this.emitExpression(cref, instr as IExprInstruction);
            return this;
        }

        if (instruction.isStatement(instr)) {
            this.emitStmt(cref, instr);
            return this;
        }

        //
        // Other types
        //

        switch (instr.instructionType) {
            case EInstructionTypes.k_FunctionDecl:
                cref.addFunction(instr as IFunctionDeclInstruction)
                this.emitFunction(cref, instr as IFunctionDeclInstruction);
                break;
            case EInstructionTypes.k_CbufferDecl:
                cref.addCbuffer(instr as ICbufferInstruction);
                this.emitCbuffer(cref, instr as ICbufferInstruction);
                break;
            case EInstructionTypes.k_VariableDecl:
                cref.addGlobal(CodeReflection.asSTRID(instr as IVariableDeclInstruction))
                // emit as part of InstructionCollector
                this.emitGlobalVariable(cref, instr as IVariableDeclInstruction);
                break;
            case EInstructionTypes.k_Collector:
                this.emitCollector(cref, instr as IInstructionCollector);
                break;
            case EInstructionTypes.k_TypeDecl:
                this.emitTypeDecl(cref, instr as ITypeDeclInstruction);
                break;
            case EInstructionTypes.k_TypedefDecl:
                this.emitTypedef(cref, instr as ITypedefInstruction);
                break;
            case EInstructionTypes.k_ComplexType:
            case EInstructionTypes.k_VariableType:
                // todo: addComplexType ?
                this.emitComplexTypeDecl(cref, instr as ITypeInstruction);
                break;
            default:
                this.emitLine(`/* ... unsupported instruction '${instr.instructionName}' .... */`);
                assert(false, `unsupported instruction found: ${instr.instructionName}`);
        }

        return this;
    }
}


export function translate(instr: IInstruction, opts?: ICodeEmitterOptions): string {
    const cref = new CodeReflection;
    return (new CodeEmitter(opts)).emit(cref, instr).toString();
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
