
import { isNull } from "util";
import { isDef, isDefAndNotNull } from "../../common";
import { EOperation } from "../../idl/bytecode/EOperations";
// import { IInstruction as IOperation, IInstructionArgument } from "../../idl/bytecode/IInstruction";
import { EInstructionTypes, IExprInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, IScope, IStmtBlockInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IRange } from "../../idl/parser/IParser";
import { Diagnostics } from "../../util/Diagnostics";
import { ArithmeticExprInstruction } from "../instructions/ArithmeticExprInstruction";
import { DeclStmtInstruction } from "../instructions/DeclStmtInstruction";
import { IntInstruction } from "../instructions/IntInstruction";
import { ReturnStmtInstruction } from "../instructions/ReturnStmtInstruction";
import { assert } from "./../../common";
import ConstanPool from "./ConstantPool";
import InstructionList from "./InstructionList";
import sizeof from "./sizeof";

enum EErrors {
    k_UnsupportedConstantType,
    k_UnsupportedExprType
}

export enum EChunkType {
    k_Constants,
    k_Code
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
        return {};
    }
}







export const REG_INVALID = (-1 >>> 0);
export const REG_RAX = 256;

const REG_NAMES = {
    [REG_RAX]: 'rax' // todo: get register adresses from bytecode generator
}


// symbol name id generation;
const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    var: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`,
    fun: (fdecl: IFunctionDeclInstruction) => `${fdecl.name}:${fdecl.instructionID}`
};

class SymbolTable<SYMBOL_T>  {
    [key: string]: SYMBOL_T;

    *[Symbol.iterator]() {
        for (let i in this) {
            yield this[i];
        }
    }
}


class ProgramContext {
    readonly diagnostics: TranslatorDiagnostics;
    readonly constants: ConstanPool;
    readonly instructions: InstructionList;

    private _symbolTable: SymbolTable<FunctionContext>;

    constructor(entry: IFunctionDeclInstruction) {
        this.diagnostics = new TranslatorDiagnostics;
        this.constants = new ConstanPool;
        this.instructions = new InstructionList;

        this._symbolTable = new SymbolTable<FunctionContext>();

        this.translate(entry);
    }

    private translate(func: IFunctionDeclInstruction) {
        this._symbolTable[sname.fun(func)] = new FunctionContext(this, func);
        this.finalize();
    }

    private finalize() {
        for (let func of this._symbolTable) {
            this.instructions.merge(func.instructions);
        }
    }

    binary(): Uint8Array {
        let chunks = [this.constChunk(), this.codeChunk()].map(ch => new Uint8Array(ch));
        let byteLength = chunks.map(x => x.byteLength).reduce((a, b) => a + b);
        let data = new Uint8Array(byteLength);
        let offset = 0;
        chunks.forEach(ch => {
            data.set(ch, offset);
            offset += ch.byteLength;
        });
        return data;
    }

    private constChunk(): ArrayBuffer {
        let mem = this.constants.data;
        let size = mem.byteLength >> 2;
        let chunkHeader = [EChunkType.k_Constants, size];
        assert((size << 2) == mem.byteLength);
        let data = new Uint32Array(chunkHeader.length + size);
        data.set(chunkHeader);
        data.set(new Uint32Array(mem.byteArray, 0, mem.byteLength >> 2), chunkHeader.length);
        return data.buffer;
    }

    
    private codeChunk(): ArrayBuffer {
        let instructions = this.instructions;
        let chunkHeader = [EChunkType.k_Code, instructions.length];
        let data = new Uint32Array(chunkHeader.length + instructions.length);
        data.set(chunkHeader);
        data.set(instructions.data, chunkHeader.length);

        return data.buffer;
    }

    //
    // Auxiliary
    //

    critical(code: EErrors, desc = {}): void {
        this.diagnostics.critical(code, desc);
    }
}

function minWidth(str: string, len: number = 0, char: string = ' ') {
    for (let i = 0, slen = str.length; i < Math.max(0, len - slen); ++i) {
        str = char + str;
    }
    return str;
}


const hex2 = (v: number) => `0x${minWidth(v.toString(16), 2, '0')}`;
const hex4 = (v: number) => `0x${minWidth(v.toString(16), 4, '0')}`;
// const reg = (v: number) => REG_NAMES[v] || `[${hex2(v >>> 0)}]`;    // register address;
// const addr = (v: number) => `%${hex4(v >>> 0)}%`;                   // global memory address;

// class Register extends Constant {
//     toString(): string {
//         let v = this._value;
//         return REG_NAMES[v] || `[${hex2(v >>> 0)}]`;
//     }

//     isValid(): boolean {
//         return this._value != REG_INVALID;
//     }
// }

// class Addr extends Constant {
//     toString(): string {
//         let v = this._value;
//         return `%${hex4(v >>> 0)}%`;
//     }
// }

class FunctionContext {
    readonly ctx: ProgramContext;
    readonly instructions: InstructionList;

    // same as stack pointer; 
    // counter grows forward;
    private _registerCounter: number;

    private _symbolTable: SymbolTable<number>;

    private _func: IFunctionDeclInstruction;


    constructor(ctx: ProgramContext, func: IFunctionDeclInstruction) {
        this.ctx = ctx;
        this.instructions = new InstructionList;

        this._registerCounter = 0;
        this._symbolTable = new SymbolTable<number>();
        this._func = func;

        this.translate(func);
    }

    get name(): string {
        return this._func.name;
    }

    get constants(): ConstanPool {
        return this.ctx.constants;
    }

    get diagnostics(): TranslatorDiagnostics {
        return this.ctx.diagnostics;
    }

    // resolve constant (all constants have been placed in global memory)
    rcost(lit: ILiteralInstruction): number {
        switch (lit.instructionType) {
            // assume only int32
            case EInstructionTypes.k_IntInstruction:
                {
                    let i32 = (lit as IntInstruction).value;
                    let r = this.deref(sname.i32(i32));
                    if (r == REG_INVALID) {
                        r = this.alloca(sizeof.i32());
                        this.icode(EOperation.k_Load, r, this.constants.checkInt32(i32), sizeof.i32());
                        this.ref(sname.i32(i32), r);
                    }
                    return r;
                }
                break;
            default:
                this.critical(EErrors.k_UnsupportedConstantType, {});
        }

        return REG_INVALID;
    }

    // assuming that all registers for all types are the same memory;
    alloca(size: number): number {
        let rc = this._registerCounter;
        this._registerCounter += size;
        return rc;
    }

    // insert code
    icode(code: EOperation, ...args: number[]): void {
        this.instructions.add(code, args);
    }

    // resolve address => returns address of temprary result of expression
    raddr(expr: IExprInstruction): number {
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
                    return this.deref(sname.var(id.declaration as IVariableDeclInstruction));
                }
            case EInstructionTypes.k_ArithmeticExprInstruction:
                {
                    const arithExpr = expr as ArithmeticExprInstruction;

                    const opMap = {
                        '+': EOperation.k_Add,
                        '-': EOperation.k_Sub,
                        '*': EOperation.k_Mul,
                        '/': EOperation.k_Div
                    }

                    let op: EOperation = opMap[arithExpr.operator];

                    if (!isDef(op)) {
                        this.critical(EErrors.k_UnsupportedExprType, {});
                        return REG_INVALID;
                    }

                    let dest = this.alloca(arithExpr.type.size);
                    this.icode(op, dest, this.raddr(arithExpr.left), this.raddr(arithExpr.right));
                    return dest;
                }
                break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return REG_INVALID;
        }
    }

    // add referene of the local variable
    ref(sname: string, r: number) {
        assert(!isDef(this._symbolTable[sname]));
        this._symbolTable[sname] = r;
    }

    deref(sname: string): number {
        // is zero register available?
        return isDef(this._symbolTable[sname]) ? this._symbolTable[sname] : REG_INVALID;
    }

    // 
    // Handle all instruction types
    //

    translate(instr: IInstruction) {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableDeclInstruction:
                {
                    let vdecl = instr as IVariableDeclInstruction;
                    if (isNull(vdecl.initExpr)) {
                        // There is no initial value, but allocation should be done anyway
                        // in order to assign register for this variable.
                        this.ref(sname.var(vdecl), this.alloca(vdecl.type.size));
                        return;
                    }
                    this.ref(sname.var(vdecl), this.raddr(vdecl.initExpr));
                    return;
                }
            case EInstructionTypes.k_DeclStmtInstruction:
                {
                    let stmt = instr as DeclStmtInstruction;
                    for (let decl of stmt.declList) {
                        this.translate(decl);
                    }
                    return;
                }
            case EInstructionTypes.k_ReturnStmtInstruction:
                {
                    let ret = instr as ReturnStmtInstruction;
                    if (!isNull(ret.expr)) {
                        // todo: check that the expr type is compatible with RAX register or should moved to stack 
                        this.icode(EOperation.k_Move, REG_RAX, this.raddr(ret.expr));
                        this.icode(EOperation.k_Ret);
                    }
                    return;
                }
            case EInstructionTypes.k_StmtBlockInstruction:
                {
                    let block = instr as IStmtBlockInstruction;
                    for (let stmt of block.stmtList) {
                        this.translate(stmt);
                    }
                    return;
                }
            case EInstructionTypes.k_FunctionDeclInstruction:
                {
                    let func = instr as IFunctionDeclInstruction;
                    let def = func.definition; // todo: handle all arguments!!
                    let impl = func.implementation;

                    this.translate(impl);

                    return;
                }
            default:
                console.warn(`Unknown statement found: ${EInstructionTypes[instr.instructionType]}`);
        }
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

export function translate(entryPoint: string, program: IInstructionCollector): ProgramContext {

    if (isNull(program)) {
        return null;
    }

    let scope = program.scope;
    let ctx: ProgramContext;

    try {
        const entryFunc = scope.findFunction(entryPoint, []);

        if (!isDefAndNotNull(entryFunc)) {
            console.error(`Entry point '${entryPoint}' not found.`);
            return null;
        }

        ctx = new ProgramContext(entryFunc);

    } catch (e) {
        throw e;
        console.error(TranslatorDiagnostics.stringify(ctx.diagnostics.resolve()));
    }

    return ctx;
}