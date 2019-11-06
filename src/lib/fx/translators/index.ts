import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { CodeEmitter } from "./CodeEmitter";
import { GlslEmitter } from "./GlslEmitter";

type IOptions = {
    type: 'vertex' | 'pixel';
};


export function emitGlsl(entryFunc: IFunctionDeclInstruction, options: IOptions): string {

    switch (options.type) {
        case 'vertex':
        case 'pixel':
            break;
        default:
            console.error('unsupported shader type');
    }

    const emitter = new GlslEmitter();
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


export function emitCode(entryFunc: IFunctionDeclInstruction, options: IOptions): string {

    switch (options.type) {
        case 'vertex':
        case 'pixel':
            break;
        default:
            console.error('unsupported shader type');
    }

    const emitter = new CodeEmitter();
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


