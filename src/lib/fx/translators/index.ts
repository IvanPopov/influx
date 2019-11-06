import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { CodeEmitter, ICodeEmitterOptions } from "./CodeEmitter";
import { GlslEmitter } from "./GlslEmitter";



export function emitGlsl(entryFunc: IFunctionDeclInstruction, options: ICodeEmitterOptions): string {
    const emitter = new GlslEmitter(options);
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


export function emitCode(entryFunc: IFunctionDeclInstruction, options: ICodeEmitterOptions): string {
    const emitter = new CodeEmitter(options);
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


