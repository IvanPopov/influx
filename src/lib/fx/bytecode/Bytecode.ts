
import debugLayout, { CdlRaw } from "./DebugLayout";
import { isNull, isNumber, isString } from "util";
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
import { FloatInstruction } from "../instructions/FloatInstruction";
import { CastExprInstruction } from "../instructions/CastExprInstruction";
import { T_INT, T_FLOAT } from "../SystemScope";
import { ComplexExprInstruction } from "../instructions/ComplexExprInstruction";

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



function Context() {
    const diag = new TranslatorDiagnostics; // todo: remove it?
    const constants = new ConstanPool;
    const instructions = new InstructionList;
    const pc = () => instructions.length >> 2;
    const debug = debugLayout(pc);

    return {
        diag,
        constants,
        instructions,
        debug,
        pc
    }
}

type ContextType = ReturnType<typeof Context>;


interface ISubProgram {
    code: Uint8Array;
    constants: ConstanPool;
    cdl: CdlRaw;
}

function translateSubProgram(ctx: ContextType, entry: IFunctionDeclInstruction): ISubProgram {
    const { diag, constants, instructions, debug } = ctx;

    debug.beginCompilationUnit('[todo]');
    translateFunction(ctx, entry);
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

function translateFunction(ctx: ContextType, func: IFunctionDeclInstruction) {
    const { diag, constants, instructions, debug, pc } = ctx;

    // same as stack pointer; 
    // counter grows forward;
    let registerCounter = 0;
    let symbolTable = new SymbolTable<number>();

    /** resolve constant (all constants have been placed in global memory) */
    function rcost(lit: ILiteralInstruction): number {
        switch (lit.instructionType) {
            // assume only int32
            case EInstructionTypes.k_IntInstruction:
                {
                    let i32 = (lit as IntInstruction).value;
                    let r = deref(sname.i32(i32));
                    if (r == REG_INVALID) {
                        r = alloca(sizeof.i32());
                        // constants.checkInt32(i32) => returns address in global memory
                        icode(EOperation.k_Load, r, constants.checkInt32(i32), sizeof.i32());
                        debug.map(lit);

                        ref(sname.i32(i32), r);
                    }
                    return r;
                }
                break;
            case EInstructionTypes.k_FloatInstruction:
                    {
                        let f32 = (lit as FloatInstruction).value;
                        let r = deref(sname.f32(f32));
                        if (r == REG_INVALID) {
                            r = alloca(sizeof.f32());
                            icode(EOperation.k_Load, r, constants.checkFloat32(f32), sizeof.f32());
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
                return rcost(expr as ILiteralInstruction);
            case EInstructionTypes.k_IdExprInstruction:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.declaration.instructionType == EInstructionTypes.k_VariableDeclInstruction);
                    return deref(sname.var(id.declaration as IVariableDeclInstruction));
                }
            case EInstructionTypes.k_ComplexExprInstruction:
                return raddr((expr as ComplexExprInstruction).expr);
            case EInstructionTypes.k_ArithmeticExprInstruction:
                {
                    const arithExpr = expr as ArithmeticExprInstruction;

                    const opIntMap = {
                        '+': EOperation.k_IAdd,
                        '-': EOperation.k_ISub,
                        '*': EOperation.k_IMul,
                        '/': EOperation.k_IDiv
                    }

                    const opFloatMap = {
                        '+': EOperation.k_FAdd,
                        '-': EOperation.k_FSub,
                        '*': EOperation.k_FMul,
                        '/': EOperation.k_FDiv
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
                    const castExpr = expr as CastExprInstruction;
                    if (castExpr.IsUseless()) {
                        console.warn(`Useless cast found: ${castExpr.toCode()}`);
                        return raddr(castExpr.expr);
                    }

                    let srcType = castExpr.expr.type;
                    let dstType = castExpr.type;

                    let op: EOperation;
                    if (srcType.isEqual(T_FLOAT) && dstType.isEqual(T_INT)) {
                        op = EOperation.k_FloatToInt;
                    } else if (srcType.isEqual(T_INT) && dstType.isEqual(T_FLOAT)) {
                        op = EOperation.k_IntToFloat;
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
                        icode(EOperation.k_Move, REG_RAX, raddr(ret.expr));
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

    let ctx = Context();
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