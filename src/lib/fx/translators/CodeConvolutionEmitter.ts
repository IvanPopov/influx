import { IInstruction, ITypeInstruction, IFunctionDeclInstruction, ITypeDeclInstruction, ITypedefInstruction, IVariableDeclInstruction, ICbufferInstruction } from "@lib/idl/IInstruction";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { CodeEmitter, CodeContext, ICodeEmitterOptions, ICodeContextOptions } from "./CodeEmitter";

export interface ICodeConvolutionContextOptions extends ICodeContextOptions {
    textDocument?: ITextDocument;
    slastDocument?: ISLASTDocument
}

export class CodeConvolutionContext extends CodeContext {
    declare readonly opts: ICodeConvolutionContextOptions;
    
    constructor(opts?: ICodeConvolutionContextOptions) {
        super(opts);
    }

    // list of convolute includes
    readonly includeDeps: string[] = [];

    get textDocument(): ITextDocument { return this.opts.textDocument; }
    get slastDocument(): ISLASTDocument { return this.opts.slastDocument; }
}

export class CodeConvolutionEmitter<ContextT extends CodeConvolutionContext> extends CodeEmitter<ContextT> {
    // todo: add caching
    protected convoluteToInclude(ctx: ContextT, decl: IInstruction) {
        if (!decl) {
            return false;
        }

        if (!ctx.slastDocument || !ctx.textDocument) {
            return false;
        }

        const src = decl.sourceNode.loc;
        const includes = ctx.slastDocument.includes;

        let dst = src;
        while (dst && String(ctx.textDocument.uri) !== String(dst.start.file)) {
            dst = includes.get(String(dst.start.file));
        }

        // no includes are found
        if (dst == src) {
            return false;
        }

        // extract original include expression
        const { start, end } = dst;
        const include = ctx.textDocument.source.substring(start.offset, end.offset);

        if (ctx.includeDeps.includes(include)) {
            return true;
        }

        ctx.includeDeps.push(include);
        return true;
    }

    emitComplexTypeDecl(ctx: ContextT, ctype: ITypeInstruction) {
        if (!this.convoluteToInclude(ctx, ctype))
            super.emitComplexTypeDecl(ctx, ctype);
    }

    emitFunction(ctx: ContextT, fn: IFunctionDeclInstruction) {
        if (!this.convoluteToInclude(ctx, fn))
            super.emitFunction(ctx, fn);
    }

    emitTypeDecl(ctx: ContextT, decl: ITypeDeclInstruction) {
        if (!this.convoluteToInclude(ctx, decl))
            super.emitTypeDecl(ctx, decl);
    }

    emitTypedef(ctx: ContextT, def: ITypedefInstruction) {
        if (!this.convoluteToInclude(ctx, def))
            super.emitTypedef(ctx, def);
    }

    emitGlobalVariable(ctx: ContextT, decl: IVariableDeclInstruction) {
        if (!this.convoluteToInclude(ctx, decl))
            super.emitGlobalVariable(ctx, decl);
    }

    emitCbuffer(ctx: ContextT, cbuf: ICbufferInstruction) {
        if (!this.convoluteToInclude(ctx, cbuf))
            super.emitCbuffer(ctx, cbuf);
    }

    toString(ctx?: ContextT): string {
        const code = super.toString();
        if (!ctx) {
            return code;
        }
        if (!ctx.includeDeps.length) {
            return code;
        }
        const includes = ctx.includeDeps.join('\n');
        return `${includes}\n\n${code}`;
    }


    emit(ctx: ContextT, instr: IInstruction): CodeConvolutionEmitter<ContextT> {
        super.emit(ctx, instr);
        return this;
    }


    private static ccEmitter = new CodeConvolutionEmitter({ omitEmptyParams: true });


    static translate(instr: IInstruction, ctx: CodeConvolutionContext = new CodeConvolutionContext): string {
        return CodeConvolutionEmitter.ccEmitter.emit(ctx, instr).toString(ctx);
    }
}




