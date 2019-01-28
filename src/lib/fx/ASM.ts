
import { IFunctionDefInstruction, EInstructionTypes } from "./../idl/IInstruction";
import { EDiagnosticCategory, Diagnostics } from "./../util/Diagnostics";
import { IInstructionCollector, IScope, IStmtBlockInstruction } from "./../idl/IInstruction";
import { isNull } from "util";
import { isDefAndNotNull } from "../common";
import { IRange } from "../idl/parser/IParser";

enum EErrors {
    k_EntryPointNotFound, // main not found
}

type ITranslatorDiagDesc = any;

class TranslatorDiagnostics extends Diagnostics<ITranslatorDiagDesc> {
    constructor() {
        super("Translator Diagnostics", 'L');
    }

    protected resolveFilename(code: number, desc: ITranslatorDiagDesc): string {
        return '[unknown]';  // todo: fixme
    }

    protected resolveRange(code: number, desc: ITranslatorDiagDesc): IRange {
        return { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }; // todo: fixme
    }

    protected diagnosticMessages() {
        return {
            [EErrors.k_EntryPointNotFound] : "Entry point '{entry}' not found.",
        };
    }
}


class Registers {

    occupy(ri: number): void {}
    
    // returns register's index
    inc(busy: boolean): number { return 0; }
}

class FunctionObject {
    locals: number; // number of registers required
    args: number;   // number of arguments

     
}

export function translate(entryPoint: string, program: IInstructionCollector): string {

    if (isNull(program)) {
        return null;
    }

    let diag = new TranslatorDiagnostics;
    let scope: IScope = program.scope;

    try {
        const entryFunc = scope.findFunction(entryPoint, []);

        if (!isDefAndNotNull(entryFunc)) {
            diag.critical(EErrors.k_EntryPointNotFound, { entryPoint });
        }

        let def: IFunctionDefInstruction = entryFunc.definition;
        let impl: IStmtBlockInstruction = entryFunc.implementation;

        for (let stmt of impl.stmtList) {
            switch (stmt.instructionType) {
                default:
                    console.warn(`Unknown statement found: ${EInstructionTypes[stmt.instructionType]}`);
            }
        }

    } catch (e) {
        console.error(TranslatorDiagnostics.stringify(diag.resolve()));
    }

    return null;
}