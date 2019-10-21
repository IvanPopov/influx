import { EOperation } from "@lib/idl/bytecode";
import { IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";
import Callstack from "./Callstack";
import ConstanPool from "./ConstantPool";
import debugLayout from "./DebugLayout";
import InstructionList from "./InstructionList";
import PromisedAddress, { IAddrDesc } from "./PromisedAddress";


export enum EErrors {
    k_UnsupportedConstantType,
    k_UnsupportedExprType,
    k_UnsupoortedTypeConversion,
    k_UnsupportedArithmeticExpr
}


// FIXME: don't use 'any' type
type ITranslatorDiagDesc = any;

export class TranslatorDiagnostics extends Diagnostics<ITranslatorDiagDesc> {
    constructor() {
        super("Translator Diagnostics", 'T');
    }

    protected resolveFilename(code: number, desc: ITranslatorDiagDesc): string {
        return '[unknown]';  // FIXME: return correct filename
    }

    protected resolveRange(code: number, desc: ITranslatorDiagDesc): IRange {
        return { start: { line: 0, column: 0, file: null }, end: { line: 0, column: 0, file: null } }; // todo: fixme
    }

    protected diagnosticMessages() {
        return {};
    }
}


export function ContextBuilder() {
    const diag = new TranslatorDiagnostics; // todo: remove it?
    
    const callstack = new Callstack();

    // program counter: return current index of instruction 
    // (each instruction consists of 4th numbers)
    const { pc, loc, instructions, debug, deref, ref, cderef, cref, alloca, icode, imove, iload, ret, consti32, constf32, constants } = callstack;

    return {
        diag,
        callstack,
        instructions,
        debug,
        pc,
        icode,
        imove,
        iload,
        ret,
        consti32,
        constf32,
        constants,

        deref,
        ref,
        cderef,
        cref,
        alloca,
        loc
    }
}

export type IContext = ReturnType<typeof ContextBuilder>;
