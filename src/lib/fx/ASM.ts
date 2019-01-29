
import { IExprInstruction, IInitExprInstruction } from "./../idl/IInstruction";
import { IFunctionDefInstruction, EInstructionTypes, IInstruction, ILiteralInstruction, IVariableDeclInstruction } from "./../idl/IInstruction";
import { EDiagnosticCategory, Diagnostics } from "./../util/Diagnostics";
import { IInstructionCollector, IScope, IStmtBlockInstruction } from "./../idl/IInstruction";
import { isNull } from "util";
import { isDefAndNotNull } from "../common";
import { IRange } from "../idl/parser/IParser";
import { IDeclStmtInstructionSettings, DeclStmtInstruction } from "./instructions/DeclStmtInstruction";
import { ArithmeticExprInstruction } from "./instructions/ArithmeticExprInstruction";

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


function unsupportedError() {
    throw new Error('unsupported');
}


enum OPERATION {
    k_Add
};

type Alias = string;
type Addr = number;


// returns whether the address contains a value or garbage
function checkAddr(addr: Addr): boolean {
    return true;
}

// add referene of the local variable to current scope
function ref(alias: Alias, addr: Addr) {

}


// resolve constant (all constants have been placed in global memory)
function rcost(lit: ILiteralInstruction): Addr {
    return 0;
}

// insert code
function icode(op: OPERATION, dest: Addr, ...args: Addr[]): void {
    
}

// resolve address => returns address of temprary result of expression
function raddr(expr: IExprInstruction): Addr {
    switch (expr.instructionType) {
        case EInstructionTypes.k_InitExprInstruction:
            {
                const init = expr as IInitExprInstruction;

                if (init.isArray()) {
                    unsupportedError();
                }

                if (!init.isConst()) {
                    unsupportedError();
                }

                // constant and not array
                return rcost(init.arguments[0] as ILiteralInstruction);
            }
        break;
        case EInstructionTypes.k_ArithmeticExprInstruction:
            {
                const arithExpr = expr as ArithmeticExprInstruction;
                switch (arithExpr.operator) {
                    case '+':
                        icode(OPERATION.k_Add, alloca(arithExpr.type.size), raddr(arithExpr.left), raddr(arithExpr.right));
                    break;
                    default:
                        unsupportedError();
                }
            }
        break;
        default:
            console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
            return 0;
    }
}

function alloca(size: number): Addr {
    return 0;
}

// 
// Handle all instruction types
//

function handleVDecl(vdecl: IVariableDeclInstruction) {
    if (isNull(vdecl.initExpr)) {
        ref(vdecl.name, alloca(vdecl.type.size));
        return;
    }
    ref(vdecl.name, raddr(vdecl.initExpr));
}

function handleUnkn(instr: IInstruction) {
    switch (instr.instructionType) {
        case EInstructionTypes.k_VariableDeclInstruction:
            handleVDecl(instr as IVariableDeclInstruction);
        break;
        case EInstructionTypes.k_DeclStmtInstruction:
            {
                let stmt = instr as DeclStmtInstruction;
                for (let decl of stmt.declList) {
                    handleUnkn(decl);
                }
            }
        break;
        default:
            console.warn(`Unknown statement found: ${EInstructionTypes[instr.instructionType]}`);
    }
}

//
// 
//

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

        // push() // begin sub-scope
        for (let stmt of impl.stmtList) {
            handleUnkn(stmt);
        }
        // pop() // release sub-scope

    } catch (e) {
        console.error(TranslatorDiagnostics.stringify(diag.resolve()));
    }

    return null;
}