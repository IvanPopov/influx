
import { IExprInstruction, IInitExprInstruction } from "./../idl/IInstruction";
import { IFunctionDefInstruction, EInstructionTypes, IInstruction, ILiteralInstruction, IVariableDeclInstruction } from "./../idl/IInstruction";
import { EDiagnosticCategory, Diagnostics } from "./../util/Diagnostics";
import { IInstructionCollector, IScope, IStmtBlockInstruction } from "./../idl/IInstruction";
import { isNull } from "util";
import { isDefAndNotNull, isDef } from "../common";
import { IRange } from "../idl/parser/IParser";
import { IDeclStmtInstructionSettings, DeclStmtInstruction } from "./instructions/DeclStmtInstruction";
import { ArithmeticExprInstruction } from "./instructions/ArithmeticExprInstruction";
import { IMap } from "lib/idl/IMap";
import { IntInstruction } from "./instructions/IntInstruction";

enum EErrors {
    k_EntryPointNotFound, // main not found

    k_UnsupportedConstantType,
    k_UnsupportedExprType

}

type ITranslatorDiagDesc = any;

class TranslatorDiagnostics extends Diagnostics<ITranslatorDiagDesc> {
    constructor() {
        super("Translator Diagnostics", 'T');
    }

    protected resolveFilename(code: number, desc: ITranslatorDiagDesc): string {
        return '[unknown]';  // todo: fixme
    }

    protected resolveRange(code: number, desc: ITranslatorDiagDesc): IRange {
        return { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }; // todo: fixme
    }

    protected diagnosticMessages() {
        return {
            [EErrors.k_EntryPointNotFound] : "Entry point '{entryPoint}' not found.",
        };
    }
}

let diag = new TranslatorDiagnostics;


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


class Globals {
    _size: Addr = 0;
    _intMap: IMap<number> = {};

    checkInt32(int: number): Addr {
        let addr: Addr = this._intMap[int];
        if (!isDef(addr)) {
            this._intMap[int] = this._size;
            this._size += 4;
            return this.checkInt32(int);
        }
        return addr;
    }

    print(): void {
        console.log(this);
    }
}

const globals: Globals = new Globals;

// resolve constant (all constants have been placed in global memory)
function rcost(lit: ILiteralInstruction): Addr {
    switch (lit.instructionType) {
        case EInstructionTypes.k_IntInstruction:
            // assume only int32
            return globals.checkInt32((lit as IntInstruction).value);
        break;
        default:
            diag.critical(EErrors.k_UnsupportedConstantType, {});
    }
    return 0;
}

let instructions = [];

// insert code
function icode(op: OPERATION, dest: Addr, ...args: Addr[]): void {
    instructions.push({ op, dest, args });
}

// stack grows forward
let stackPointer = 0;
function alloca(size: number): Addr {
    let sp = stackPointer;
    sp += size;
    return sp;
}


// resolve address => returns address of temprary result of expression
function raddr(expr: IExprInstruction): Addr {
    switch (expr.instructionType) {
        case EInstructionTypes.k_InitExprInstruction:
            {
                const init = expr as IInitExprInstruction;

                if (init.isArray()) {
                    diag.critical(EErrors.k_UnsupportedExprType, {});
                }

                let arg = init.arguments[0];
                switch(arg.instructionType) {
                    case EInstructionTypes.k_ArithmeticExprInstruction:
                        return raddr(arg);
                    case EInstructionTypes.k_IntInstruction:
                        return rcost(arg as ILiteralInstruction);
                    default:
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                        return -1;
                }
            }
        break;
        case EInstructionTypes.k_ArithmeticExprInstruction:
            {
                const arithExpr = expr as ArithmeticExprInstruction;
                switch (arithExpr.operator) {
                    case '+':
                        let dest: Addr = alloca(arithExpr.type.size);
                        icode(OPERATION.k_Add, dest, raddr(arithExpr.left), raddr(arithExpr.right));
                        return dest;
                    break;
                    default:
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                        return -1;
                }
            }
        break;
        default:
            console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
            return -1;
    }
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
        throw e;
        console.error(TranslatorDiagnostics.stringify(diag.resolve()));
    }

    globals.print();
    instructions.forEach(i => console.log(i));

    return null;
}