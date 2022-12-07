import { IInstruction, ITypeInstruction, IFunctionDeclInstruction, ITypeDeclInstruction, ITypedefInstruction, IVariableDeclInstruction, ICbufferInstruction } from "@lib/idl/IInstruction";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { CodeEmitter, CodeReflection, ICodeEmitterOptions, IConvolutionPack } from "./CodeEmitter";


export class CodeConvolutionEmitter<CodeReflectionT extends CodeReflection> extends CodeEmitter<CodeReflectionT> {
    // list of convolute includes
    protected includeDeps: string[] = [];

    constructor(protected textDocument?: ITextDocument, protected slastDocument?: ISLASTDocument, opts?: ICodeEmitterOptions) {
        super(opts);
    }

    // todo: add caching
    protected convoluteToInclude(decl: IInstruction) {
        if (!decl) {
            return false;
        }

        if (!this.slastDocument || !this.textDocument) {
            return false;
        }

        const src = decl.sourceNode.loc;
        const includes = this.slastDocument.includes;

        let dst = src;
        while (dst && String(this.textDocument.uri) !== String(dst.start.file)) {
            dst = includes.get(String(dst.start.file));
        }

        // no includes are found
        if (dst == src) {
            return false;
        }

        // extract original include expression
        const { start, end } = dst;
        const include = this.textDocument.source.substring(start.offset, end.offset);

        if (this.includeDeps.includes(include)) {
            return true;
        }

        this.includeDeps.push(include);
        return true;
    }

    emitComplexTypeDecl(cref: CodeReflectionT, ctype: ITypeInstruction) {
        if (!this.convoluteToInclude(ctype))
            super.emitComplexTypeDecl(cref, ctype);
    }

    emitFunction(cref: CodeReflectionT, fn: IFunctionDeclInstruction) {
        if (!this.convoluteToInclude(fn))
            super.emitFunction(cref, fn);
    }

    emitTypeDecl(cref: CodeReflectionT, decl: ITypeDeclInstruction) {
        if (!this.convoluteToInclude(decl))
            super.emitTypeDecl(cref, decl);
    }

    emitTypedef(cref: CodeReflectionT, def: ITypedefInstruction) {
        if (!this.convoluteToInclude(def))
            super.emitTypedef(cref, def);
    }

    emitGlobalVariable(cref: CodeReflectionT, decl: IVariableDeclInstruction) {
        if (!this.convoluteToInclude(decl))
            super.emitGlobalVariable(cref, decl);
    }

    emitCbuffer(cref: CodeReflectionT, cbuf: ICbufferInstruction) {
        if (!this.convoluteToInclude(cbuf))
            super.emitCbuffer(cref, cbuf);
    }

    toString(): string {
        let code = super.toString();
        if (!this.includeDeps.length) {
            return code;
        }

        let includes = this.includeDeps.join('\n');
        return `${includes}\n\n${code}`;
    }
}

// auxiliary version for convenience and debugging
export function translateConvolute(instr: IInstruction, { textDocument, slastDocument }: IConvolutionPack, opts?: ICodeEmitterOptions): string {
    const cref = new CodeReflection;
    return (new CodeConvolutionEmitter(textDocument, slastDocument, opts)).emit(cref, instr).toString();
}
