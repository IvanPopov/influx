
import { isNull, isString } from "util";
import { isDef, isDefAndNotNull } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
// import { IInstruction as IOperation, IInstructionArgument } from "@lib/idl/bytecode/IInstruction";
import { EInstructionTypes, IComplexExprInstruction, IExprInstruction, IFunctionDeclInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPostfixPointInstruction, IScope, IStmtBlockInstruction, IVariableDeclInstruction, ICastExprInstruction, IArithmeticExprInstruction, IExprStmtInstruction, IAssignmentExprInstruction } from "@lib/idl/IInstruction";
import { IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";
import { DeclStmtInstruction } from "@lib/fx/instructions/DeclStmtInstruction";
import { ReturnStmtInstruction } from "@lib/fx/instructions/ReturnStmtInstruction";
import { T_FLOAT, T_INT } from "@lib/fx/SystemScope";
import { assert } from "@lib/common";
import ConstanPool from "@lib/fx/bytecode/ConstantPool";
import debugLayout, { CdlRaw } from "./DebugLayout";
import InstructionList from "@lib/fx/bytecode/InstructionList";
import sizeof from "@lib/fx/bytecode/sizeof";

enum EErrors {
    k_UnsupportedConstantType,
    k_UnsupportedExprType,
    k_UnsupoortedTypeConversion,
    k_UnsupportedArithmeticExpr
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
        return { start: { line: 0, column: 0, file: null }, end: { line: 0, column: 0, file: null } }; // todo: fixme
    }

    protected diagnosticMessages() {
        return {};
    }
}


export const REG_INVALID = (-1 >>> 0);
export const REG_RAX = 256;
export const DEFAULT_ENTRY_POINT_NAME = 'main';

const REG_NAMES = {
    [REG_RAX]: 'rax' // todo: get register adresses from bytecode generator
}

// symbol name id generation;
const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    f32: (f32: number) => `%f32:${f32}`,
    var: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`,
    fun: (fdecl: IFunctionDeclInstruction) => `${fdecl.name}:${fdecl.instructionID}`,

    addr: (addr: number) => sname.i32(addr)
};

/**
 * A simplified symbol table containing the correspondence of unique 
 * hashes of symbols and their addresses in registers.
 * The table is global and does not depend on the stack of functions, 
 * because hashes are built on the basis of identifiers of instructions 
 * unique to each function and context.
 * todo: clean up table after each function call, because adresses of registers are global
 */
class SymbolTable<SYMBOL_T>  {
    [key: string]: SYMBOL_T;

    *[Symbol.iterator]() {
        for (let i in this) {
            yield this[i];
        }
    }
}


class Callstack {
    stack: IFunctionDeclInstruction[] = [];

    get top(): IFunctionDeclInstruction {
        return this.stack[this.depth - 1];
    }

    get depth(): number {
        return this.stack.length;
    }

    push(entry: IFunctionDeclInstruction) {
        this.stack.push(entry);
    }

    pop() {
        return this.stack.pop();
    }
}


function ContextBuilder() {
    const diag = new TranslatorDiagnostics; // todo: remove it?
    const constants = new ConstanPool;
    const instructions = new InstructionList;
    // program counter: return current index of instruction 
    // (each instruction consists of 4th numbers)
    const pc = () => instructions.length >> 2;
    const debug = debugLayout(pc);
    const callstack = new Callstack;

    return {
        diag,
        callstack,
        constants,
        instructions,
        debug,
        pc
    }
}

type Context = ReturnType<typeof ContextBuilder>;


interface ISubProgram {
    code: Uint8Array;
    constants: ConstanPool;
    cdl: CdlRaw;
}

function translateSubProgram(ctx: Context, fn: IFunctionDeclInstruction): ISubProgram {
    const { diag, callstack, constants, instructions, debug } = ctx;

    debug.beginCompilationUnit('[todo]'); // << it does nothing at the momemt :/

    callstack.push(fn);
    translateFunction(ctx, fn);
    callstack.pop();
    debug.endCompilationUnit();


    function constChunk(): ArrayBuffer {
        let mem = constants.data;
        let size = mem.byteLength >> 2;
        let chunkHeader = [EChunkType.k_Constants, size];
        assert((size << 2) == mem.byteLength);
        let data = new Uint32Array(chunkHeader.length + size);
        data.set(chunkHeader);
        data.set(new Uint32Array(mem.byteArray, 0, mem.byteLength >> 2), chunkHeader.length);
        return data.buffer;
    }


    function codeChunk(): ArrayBuffer {
        let chunkHeader = [EChunkType.k_Code, instructions.length];
        let data = new Uint32Array(chunkHeader.length + instructions.length);
        data.set(chunkHeader);
        data.set(instructions.data, chunkHeader.length);

        return data.buffer;
    }

    function binary(): Uint8Array {
        let chunks = [constChunk(), codeChunk()].map(ch => new Uint8Array(ch));
        let byteLength = chunks.map(x => x.byteLength).reduce((a, b) => a + b);
        let data = new Uint8Array(byteLength);
        let offset = 0;
        chunks.forEach(ch => {
            data.set(ch, offset);
            offset += ch.byteLength;
        });
        return data;
    }

    let code = binary();         // todo: stay only binary view
    let cdl = debug.dump();      // code debug layout;

    return { code, constants, cdl };
}

function translateFunction(ctx: Context, func: IFunctionDeclInstruction) {
    const { diag, callstack, constants, instructions, debug, pc } = ctx;

    // same as stack pointer; 
    // counter grows forward;
    let registerCounter = 0;
    let symbolTable = new SymbolTable<number>();

    /** resolve input (memory type for arguments, like vertex input for vertex shader) */
    function rinput(): number {
        return 0;
    }

    /** resolve constant (all constants have been placed in global memory) */
    function rconst(lit: ILiteralInstruction): number {
        switch (lit.instructionType) {
            // assume only int32
            case EInstructionTypes.k_IntInstruction:
                {
                    let i32 = <number>(lit as ILiteralInstruction).value;
                    let r = deref(sname.i32(i32));
                    if (r == REG_INVALID) {
                        r = alloca(sizeof.i32());
                        // constants.checkInt32(i32) => returns address in global memory
                        icode(EOperation.k_LoadConst, r, constants.checkInt32(i32), sizeof.i32());
                        debug.map(lit);

                        ref(sname.i32(i32), r);
                    }
                    return r;
                }
                break;
            case EInstructionTypes.k_FloatInstruction:
                {
                    let f32 = <number>(lit as ILiteralInstruction).value;
                    let r = deref(sname.f32(f32));
                    if (r == REG_INVALID) {
                        r = alloca(sizeof.f32());
                        icode(EOperation.k_LoadConst, r, constants.checkFloat32(f32), sizeof.f32());
                        debug.map(lit);

                        ref(sname.f32(f32), r);
                    }
                    return r;
                }
                break;
            default:
                diag.critical(EErrors.k_UnsupportedConstantType, {});
        }

        return REG_INVALID;
    }


    function rconst_addr(addr: number): number {
        let r = deref(sname.addr(addr));
        if (r == REG_INVALID) {
            r = alloca(sizeof.addr());
            icode(EOperation.k_LoadConst, r, constants.checkAddr(addr), sizeof.addr());
            ref(sname.addr(addr), r);
        }
        return r;
    }

    /**
     * (assuming that all registers for all types are placed in the same memory)
     */
    function alloca(size: number): number {
        let rc = registerCounter;
        registerCounter += size;
        return rc;
    }

    /** insert code */
    function icode(code: EOperation, ...args: number[]): void {
        // add this instruction to debug layout;
        debug.step();
        instructions.add(code, args);
    }

    /** resolve address => returns address of temprary result of expression */
    function raddr(expr: IExprInstruction): number {
        switch (expr.instructionType) {
            case EInstructionTypes.k_InitExprInstruction:
                {
                    const init = expr as IInitExprInstruction;

                    if (init.isArray()) {
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                    }

                    let arg = init.arguments[0];
                    return raddr(arg);
                }
                break;
            case EInstructionTypes.k_IntInstruction:
            case EInstructionTypes.k_FloatInstruction:
                return rconst(expr as ILiteralInstruction);
            case EInstructionTypes.k_IdExprInstruction:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.declaration.instructionType == EInstructionTypes.k_VariableDeclInstruction); // useless check?
                    return deref(sname.var(id.declaration as IVariableDeclInstruction));
                }
            case EInstructionTypes.k_ComplexExprInstruction:
                return raddr((expr as IComplexExprInstruction).expr);
            case EInstructionTypes.k_ArithmeticExprInstruction:
                {
                    const arithExpr = expr as IArithmeticExprInstruction;

                    const opIntMap = {
                        '+': EOperation.k_I32Add,
                        '-': EOperation.k_I32Sub,
                        '*': EOperation.k_I32Mul,
                        '/': EOperation.k_I32Div
                    }

                    const opFloatMap = {
                        '+': EOperation.k_F32Add,
                        '-': EOperation.k_F32Sub,
                        '*': EOperation.k_F32Mul,
                        '/': EOperation.k_F32Div
                    }

                    let op: EOperation;

                    if (arithExpr.type.isEqual(T_INT)) {
                        op = opIntMap[arithExpr.operator];
                    } else if (arithExpr.type.isEqual(T_FLOAT)) {
                        op = opFloatMap[arithExpr.operator];
                    } else {
                        // todo: add type description
                        diag.critical(EErrors.k_UnsupportedArithmeticExpr, {});
                    }

                    if (!isDef(op)) {
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                        return REG_INVALID;
                    }

                    let dest = alloca(arithExpr.type.size);
                    icode(op, dest, raddr(arithExpr.left), raddr(arithExpr.right));
                    debug.map(arithExpr);
                    return dest;
                }
                break;
            case EInstructionTypes.k_CastExprInstruction:
                {
                    const castExpr = expr as ICastExprInstruction;
                    if (castExpr.isUseless()) {
                        console.warn(`Useless cast found: ${castExpr.toCode()}`);
                        return raddr(castExpr.expr);
                    }

                    let srcType = castExpr.expr.type;
                    let dstType = castExpr.type;

                    let op: EOperation;
                    if (srcType.isEqual(T_FLOAT) && dstType.isEqual(T_INT)) {
                        op = EOperation.k_F32ToI32;
                    } else if (srcType.isEqual(T_INT) && dstType.isEqual(T_FLOAT)) {
                        op = EOperation.k_I32ToF32;
                    } else {
                        // todo: add type descriptions
                        diag.critical(EErrors.k_UnsupoortedTypeConversion, {});
                        return REG_INVALID;
                    }

                    let dest = alloca(castExpr.type.size);
                    icode(op, dest, raddr(castExpr.expr));
                    debug.map(castExpr);
                    return dest;
                }
                break;
            case EInstructionTypes.k_PostfixPointInstruction:
                {
                    const point = expr as IPostfixPointInstruction;
                    const elementAddr = raddr(point.element);
                    const padding = point.postfix.type.padding;

                    if (point.isConst() || true) { // todo
                        return elementAddr + padding;
                    }

                    // TOOD: add support for move_reg_ptr, move_ptr_ptr
                    if (padding > 0) {
                        const postfixReg = rconst_addr(padding);     // write element's padding to register
                        const elementReg = rconst_addr(elementAddr); // write element's addr to register
                        const destReg = alloca(sizeof.addr());
                        icode(EOperation.k_I32Add, destReg, elementReg, postfixReg);
                        debug.map(point);
                        return destReg; // << !!!! return addr!!!
                    }

                    return elementAddr;
                }
                break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return REG_INVALID;
        }
    }

    /**
     * Add referene of the local variable.
     * @param sname Variable name or hash.
     * @param r Register number.
     */
    function ref(sname: string, r: number) {
        assert(!isDef(symbolTable[sname]));
        symbolTable[sname] = r;
    }

    function deref(sname: string): number {
        // is zero register available?
        return isDef(symbolTable[sname]) ? symbolTable[sname] : REG_INVALID;
    }

    // 
    // Handle all instruction types
    //

    function translate(instr: IInstruction) {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableDeclInstruction:
                {
                    let decl = instr as IVariableDeclInstruction;

                    if (isNull(decl.initExpr)) {
                        // There is no initial value, but allocation should be done anyway
                        // in order to assign register for this variable.
                        ref(sname.var(decl), alloca(decl.type.size));
                        return;
                    }

                    /*
                    0: int a = 1;           | 0x00: load %a   #1        | NS 0
                    1: int b = 2;           | 0x01: load %b   #2        | NS 1
                    2: int c = a + b * 10;  | 0x02: load %t0  #10       |
                                            | 0x03: mul  $t1  %b %t0    |
                                            | 0x02: add  %c   %a %t1    | NS 2
                    3: return c;            | 0x03: move %rax %c        | NS 3
                                            | 0x04: ret                 |
                                            |
                    */

                    ref(sname.var(decl), raddr(decl.initExpr));
                    debug.ns();
                    return;
                }
            case EInstructionTypes.k_DeclStmtInstruction:
                {
                    let stmt = instr as DeclStmtInstruction;
                    for (let decl of stmt.declList) {
                        translate(decl);
                    }
                    return;
                }
            case EInstructionTypes.k_ReturnStmtInstruction:
                {
                    let ret = instr as ReturnStmtInstruction;
                    if (!isNull(ret.expr)) {
                        // todo: check that the expr type is compatible with RAX register or should moved to stack 
                        icode(EOperation.k_I32MoveRegToReg, REG_RAX, raddr(ret.expr));
                        debug.map(ret.expr);
                        debug.ns();
                        icode(EOperation.k_Ret);
                        debug.map(ret);
                    }
                    return;
                }
            case EInstructionTypes.k_StmtBlockInstruction:
                {
                    let block = instr as IStmtBlockInstruction;
                    for (let stmt of block.stmtList) {
                        translate(stmt);
                    }
                    return;
                }
            case EInstructionTypes.k_FunctionDeclInstruction:
                {
                    let func = instr as IFunctionDeclInstruction;
                    let def = func.definition; // todo: handle all arguments!!
                    let impl = func.implementation;

                    translate(impl);

                    return;
                }
            case EInstructionTypes.k_ExprStmtInstruction:
                {
                    let stmt = instr as IExprStmtInstruction;
                    translate(stmt.expr);
                    return;
                }
            case EInstructionTypes.k_AssignmentExprInstruction:
                {
                    let assigment = instr as IAssignmentExprInstruction;
                    assert(assigment.type.size % sizeof.i32() === 0);
                    let nmove = assigment.type.size / sizeof.i32();
                    let leftAddr = raddr(assigment.left);
                    // todo: fix type of right expr!
                    let rightAddr = raddr(assigment.right as IExprInstruction);
                    for (let i = 0; i < nmove; ++ i) {
                        // todo: check type of left expr and use 'store' insread of 'move' if needed
                        icode(EOperation.k_I32MoveRegToReg, leftAddr + i * 4, rightAddr);
                    }
                    debug.map(assigment);
                    debug.ns();
                    return;
                }
            default:
                console.warn(`Unknown statement found: ${EInstructionTypes[instr.instructionType]}`);
        }
    }

    translate(func);
}


const hex2 = (v: number) => `0x${v.toString(16).padStart(2, '0')}`;
const hex4 = (v: number) => `0x${v.toString(16).padStart(4, '0')}`;
// const reg = (v: number) => REG_NAMES[v] || `[${hex2(v >>> 0)}]`;    // register address;
// const addr = (v: number) => `%${hex4(v >>> 0)}%`;                   // global memory address;


export function translate(entryFunc: IFunctionDeclInstruction): ISubProgram;
export function translate(entryPoint: string, scope: IScope): ISubProgram;
export function translate(...argv): ISubProgram {
    let func: IFunctionDeclInstruction;
    if (isString(argv[0])) {
        let fname = argv[0];
        let scope = argv[1];
        func = scope.findFunction(fname, []);
    } else {
        func = argv[0];
    }

    let ctx = ContextBuilder();
    let res = null;

    try {
        if (!isDefAndNotNull(func)) {
            console.error(`Entry point '${func.name}' not found.`);
            return null;
        }
        res = translateSubProgram(ctx, func);
    } catch (e) {
        throw e;
        console.error(TranslatorDiagnostics.stringify(ctx.diag.resolve()));
    }

    return res;
}