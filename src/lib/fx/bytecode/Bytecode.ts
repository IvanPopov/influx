
import { IExprInstruction, IInitExprInstruction } from "../../idl/IInstruction";
import { IFunctionDefInstruction, EInstructionTypes, IInstruction, ILiteralInstruction, IVariableDeclInstruction } from "../../idl/IInstruction";
import { EDiagnosticCategory, Diagnostics } from "../../util/Diagnostics";
import { IInstructionCollector, IScope, IStmtBlockInstruction } from "../../idl/IInstruction";
import { isNull } from "util";
import { isDefAndNotNull, isDef } from "../../common";
import { IRange } from "../../idl/parser/IParser";
import { IDeclStmtInstructionSettings, DeclStmtInstruction } from "../instructions/DeclStmtInstruction";
import { ArithmeticExprInstruction } from "../instructions/ArithmeticExprInstruction";
import { IMap } from "../../idl/IMap";
import { IntInstruction } from "../instructions/IntInstruction";
import { EOperations } from "../../idl/bytecode/EOperations";
import { IInstruction as IOperation } from "../../idl/bytecode/IInstruction";

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


type Alias = string;
type Addr = number;


class GlobalsRow {
    byteArray: ArrayBuffer;
    byteLength: number;
    
    debugView: {range: number; value: number | string; } [];

    constructor () {
        this.byteArray = new ArrayBuffer(4);
        this.byteLength = 0;
        this.debugView = [];
    }

    get byteCapacity(): number {
        return this.byteArray.byteLength;
    }

    private check(byteSize: number) {
        if ((this.byteLength + byteSize) <= this.byteCapacity) {
            return;
        }
        // this.byteArray = ArrayBuffer.transfer(this.byteArray, this.byteCapacity * 2);
        var oldBuffer = this.byteArray;
        var newBuffer = new ArrayBuffer(this.byteCapacity * 2);
        new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer));

        this.byteArray = newBuffer;
    }

    addInt32(i32: number) {
        this.check(4);
        new DataView(this.byteArray).setInt32(this.byteLength, i32);
        this.byteLength += 4;

        this.debugView.push({ range: 4, value: i32 });
    }
}

class Globals {
    _data: GlobalsRow = new GlobalsRow;
    _intMap: IMap<number> = {};

    checkInt32(i32: number): Addr {
        let addr: Addr = this._intMap[i32];
        if (!isDef(addr)) {
            this._intMap[i32] = this._data.byteLength;
            this._data.addInt32(i32);
            return this._intMap[i32];
        }
        return addr;
    }

    get data(): GlobalsRow {
        return this._data;
    }
}

// 
// Handle all instruction types
//

function handleVDecl(ctx: Context, vdecl: IVariableDeclInstruction) {
    if (isNull(vdecl.initExpr)) {
        ctx.ref(vdecl.name, ctx.alloca(vdecl.type.size));
        return;
    }
    ctx.ref(vdecl.name, ctx.raddr(vdecl.initExpr));
}


function handleUnkn(ctx: Context, instr: IInstruction) {
    switch (instr.instructionType) {
        case EInstructionTypes.k_VariableDeclInstruction:
            handleVDecl(ctx, instr as IVariableDeclInstruction);
        break;
        case EInstructionTypes.k_DeclStmtInstruction:
            {
                let stmt = instr as DeclStmtInstruction;
                for (let decl of stmt.declList) {
                    handleUnkn(ctx, decl);
                }
            }
        break;
        default:
            console.warn(`Unknown statement found: ${EInstructionTypes[instr.instructionType]}`);
    }
}



class Context {
    readonly diagnostics: TranslatorDiagnostics;
    readonly globals: Globals;
    readonly instructions: IOperation[];
    
    private _stackPointer: number; // stack grows forward


    constructor () {
        this.diagnostics = new TranslatorDiagnostics;
        this.globals = new Globals;
        this.instructions = [];

        this._stackPointer = 0;
    }

    // resolve constant (all constants have been placed in global memory)
    rcost(lit: ILiteralInstruction): Addr {
        switch (lit.instructionType) {
            case EInstructionTypes.k_IntInstruction:
                // assume only int32
                return this.globals.checkInt32((lit as IntInstruction).value);
            break;
            default:
                this.critical(EErrors.k_UnsupportedConstantType, {});
        }
        return 0;
    }

    alloca(size: number): Addr {
        let sp = this._stackPointer;
        sp += size;
        return sp;
    }

    // insert code
    icode(op: EOperations, dest: Addr, ...args: Addr[]): void {
        this.instructions.push({ op, dest, args });
    }

    // resolve address => returns address of temprary result of expression
    raddr(expr: IExprInstruction): Addr {
        switch (expr.instructionType) {
            case EInstructionTypes.k_InitExprInstruction:
                {
                    const init = expr as IInitExprInstruction;

                    if (init.isArray()) {
                        this.critical(EErrors.k_UnsupportedExprType, {});
                    }

                    let arg = init.arguments[0];
                    switch(arg.instructionType) {
                        case EInstructionTypes.k_ArithmeticExprInstruction:
                            return this.raddr(arg);
                        case EInstructionTypes.k_IntInstruction:
                            return this.rcost(arg as ILiteralInstruction);
                        default:
                            this.critical(EErrors.k_UnsupportedExprType, {});
                            return -1;
                    }
                }
            break;
            case EInstructionTypes.k_ArithmeticExprInstruction:
                {
                    const arithExpr = expr as ArithmeticExprInstruction;
                    switch (arithExpr.operator) {
                        case '+':
                            let dest: Addr = this.alloca(arithExpr.type.size);
                            this.icode(EOperations.k_Add, dest, this.raddr(arithExpr.left), this.raddr(arithExpr.right));
                            return dest;
                        break;
                        default:
                            this.critical(EErrors.k_UnsupportedExprType, {});
                            return -1;
                    }
                }
            break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return -1;
        }
    }

    // returns whether the address contains a value or garbage
    checkAddr(addr: Addr): boolean {
        return true;
    }

    // add referene of the local variable to current scope
    ref(alias: Alias, addr: Addr) {

    }

    critical(code: EErrors, desc = {}): void {
        this.diagnostics.critical(code, desc);
    }
}

//
// 
//

export function translate(entryPoint: string, program: IInstructionCollector): Context {

    if (isNull(program)) {
        return null;
    }

    let scope: IScope = program.scope;
    let ctx: Context = new Context;

    try {
        const entryFunc = scope.findFunction(entryPoint, []);

        if (!isDefAndNotNull(entryFunc)) {
            ctx.critical(EErrors.k_EntryPointNotFound, { entryPoint });
        }

        let def: IFunctionDefInstruction = entryFunc.definition;
        let impl: IStmtBlockInstruction = entryFunc.implementation;

        // push() // begin sub-scope
        for (let stmt of impl.stmtList) {
            handleUnkn(ctx, stmt);
        }
        // pop() // release sub-scope

    } catch (e) {
        throw e;
        console.error(TranslatorDiagnostics.stringify(ctx.diagnostics.resolve()));
    }

    return ctx;
}