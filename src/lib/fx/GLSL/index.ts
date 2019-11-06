import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { createCodeEmitter, ICodeEmitter } from "./CodeEmitter";

type IOptions = {
    type: 'vertex' | 'pixel';
};


export function translate(entryFunc: IFunctionDeclInstruction, options: IOptions): string {

    switch (options.type) {
        case 'vertex':
        case 'pixel':
            break;
        default:
            console.error('unsupported shader type');
    }

    const emitter: ICodeEmitter = createCodeEmitter();
    emitter.emitFunction(entryFunc);

    return emitter.toString();
}


