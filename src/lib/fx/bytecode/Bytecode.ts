
import { IExprInstruction, IInitExprInstruction, IIdInstruction, IIdExprInstruction } from "../../idl/IInstruction";
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
import { assert } from "./../../common";

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
type Register = number;


class ConstantPoolMemory {
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
        this.check(sizeof.i32());
        new DataView(this.byteArray).setInt32(this.byteLength, i32);
        this.byteLength += sizeof.i32();

        this.debugView.push({ range: sizeof.i32(), value: i32 });
    }
}

class ConstanPool {
    _data: ConstantPoolMemory = new ConstantPoolMemory;
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

    get data(): ConstantPoolMemory {
        return this._data;
    }
}

// 
// Handle all instruction types
//

function handleVarDecl(ctx: Context, vdecl: IVariableDeclInstruction) {
    if (isNull(vdecl.initExpr)) {
        // There is no initial value, but allocation should be done anyway
        // in order to assign register for this variable.
        ctx.ref(sname.vdecl(vdecl), ctx.alloca(vdecl.type.size));
        return;
    }
    ctx.ref(sname.vdecl(vdecl), ctx.raddr(vdecl.initExpr));
}


function handleUnkn(ctx: Context, instr: IInstruction) {
    switch (instr.instructionType) {
        case EInstructionTypes.k_VariableDeclInstruction:
            handleVarDecl(ctx, instr as IVariableDeclInstruction);
        break;
        case EInstructionTypes.k_DeclStmtInstruction:
            {
                let stmt = instr as DeclStmtInstruction;
                for (let decl of stmt.declList) {
                    handleUnkn(ctx, decl);
                }
            }
        break;
        case EInstructionTypes.k_ReturnStmtInstruction:
        // todo
        default:
            console.warn(`Unknown statement found: ${EInstructionTypes[instr.instructionType]}`);
    }
}


const INVALID_REGISTER = (-1 >>> 0);

const sizeof = {
    i32: () => 4
};

// symbold name id generation;
const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    vdecl: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`
};


class Context {
    readonly diagnostics: TranslatorDiagnostics;
    readonly globals: ConstanPool;
    readonly instructions: IOperation[];
    
    // same as stack pointer; 
    // counter grows forward;
    private _registerCounter: number;

    private _symbolTable: { [varName: string]: Register; };


    constructor () {
        this.diagnostics = new TranslatorDiagnostics;
        this.globals = new ConstanPool;
        this.instructions = [];

        this._registerCounter = 0;
        // this._scope = null;
        this._symbolTable = {};
    }

    // resolve constant (all constants have been placed in global memory)
    rcost(lit: ILiteralInstruction): Addr {
        switch (lit.instructionType) {
            // assume only int32
            case EInstructionTypes.k_IntInstruction:
            {
                let i32 = (lit as IntInstruction).value;
                let addr = this.deref(sname.i32(i32));
                if (addr == INVALID_REGISTER) {
                    addr = this.alloca(sizeof.i32());
                    this.icode(EOperations.k_Load, addr, this.globals.checkInt32(i32), sizeof.i32());
                    this.ref(sname.i32(i32), addr);
                }
                return addr;
            }
            break;
            default:
                this.critical(EErrors.k_UnsupportedConstantType, {});
        }
        return 0;
    }

    // assuming that all registers for all types are the same memory;
    alloca(size: number): Addr {
        let rc = this._registerCounter;
        this._registerCounter += size;
        return rc;
    }

    // insert code
    icode(code: EOperations, dest: Addr, ...args: Addr[]): void {
        this.instructions.push({ code, dest, args });
    }

    // resolve address => returns address of temprary result of expression
    raddr(expr: IExprInstruction): Register {
        switch (expr.instructionType) {
            case EInstructionTypes.k_InitExprInstruction:
                {
                    const init = expr as IInitExprInstruction;

                    if (init.isArray()) {
                        this.critical(EErrors.k_UnsupportedExprType, {});
                    }

                    let arg = init.arguments[0];
                    return this.raddr(arg);
                }
            break;
            case EInstructionTypes.k_IntInstruction:
                return this.rcost(expr as ILiteralInstruction);
            case EInstructionTypes.k_IdExprInstruction:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.declaration.instructionType == EInstructionTypes.k_VariableDeclInstruction);
                    return this.deref(sname.vdecl(id.declaration as IVariableDeclInstruction));
                }
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
                            return INVALID_REGISTER;
                    }
                }
            break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return INVALID_REGISTER;
        }
    }

    // returns whether the address contains a value or garbage
    // checkAddr(addr: Addr): boolean {
    //     return true;
    // }



    // add referene of the local variable
    ref(sname: string, addr: Register) {
        assert(!isDef(this._symbolTable[sname]));
        this._symbolTable[sname] = addr;
    }

    deref(sname: string): Register {
        // is zero register available?
        return isDef(this._symbolTable[sname])? this._symbolTable[sname] : INVALID_REGISTER;
    }

    //
    // Auxiliary
    //

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

        for (let stmt of impl.stmtList) {
            handleUnkn(ctx, stmt);
        }

    } catch (e) {
        throw e;
        console.error(TranslatorDiagnostics.stringify(ctx.diagnostics.resolve()));
    }

    return ctx;
}