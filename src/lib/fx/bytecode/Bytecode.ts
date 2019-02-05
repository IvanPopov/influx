
import { isNull } from "util";
import { isDef, isDefAndNotNull } from "../../common";
import { EOperations } from "../../idl/bytecode/EOperations";
import { IInstruction as IOperation, IInstructionArgument } from "../../idl/bytecode/IInstruction";
import { EInstructionTypes, IExprInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, IScope, IStmtBlockInstruction, IVariableDeclInstruction, IFunctionDeclInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IRange } from "../../idl/parser/IParser";
import { Diagnostics } from "../../util/Diagnostics";
import { ArithmeticExprInstruction } from "../instructions/ArithmeticExprInstruction";
import { DeclStmtInstruction } from "../instructions/DeclStmtInstruction";
import { IntInstruction } from "../instructions/IntInstruction";
import { ReturnStmtInstruction } from "../instructions/ReturnStmtInstruction";
import { assert } from "./../../common";

enum EErrors {
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
        return {};
    }
}


class ConstantPoolMemory {
    byteArray: ArrayBuffer;
    byteLength: number;
    
    layout: {range: number; value: number | string; } [];

    constructor () {
        this.byteArray = new ArrayBuffer(4);
        this.byteLength = 0;
        this.layout = [];
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

        this.layout.push({ range: sizeof.i32(), value: i32 });
    }
}

class ConstanPool {
    _data: ConstantPoolMemory = new ConstantPoolMemory;
    _intMap: IMap<number> = {};

    checkInt32(i32: number): number {
        let addr = this._intMap[i32];
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



const REG_INVALID = (-1 >>> 0);
const REG_RAX = 256;

const REG_NAMES = {
    [REG_RAX] : 'rax' // todo: get register adresses from bytecode generator
}

const sizeof = {
    i32: () => 4
};

// symbol name id generation;
const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    var: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`,
    fun: (fdecl: IFunctionDeclInstruction) => `${fdecl.name}:${fdecl.instructionID}`
};

class SymbolTable<SYMBOL_T>  {
    [key: string]: SYMBOL_T;

    *[Symbol.iterator]() {
        for(let i in this) {
            yield this[i];
        }
    }
}


class ProgramContext {
    readonly diagnostics: TranslatorDiagnostics;
    readonly constants: ConstanPool;
    readonly instructions: IOperation[];

    private _symbolTable: SymbolTable<FunctionContext>;

    constructor (entry: IFunctionDeclInstruction) {
        this.diagnostics = new TranslatorDiagnostics;
        this.constants = new ConstanPool;
        this.instructions = [];

        this._symbolTable = new SymbolTable<FunctionContext>();

        this.translate(entry);
    }

    private translate(func: IFunctionDeclInstruction) {
        this._symbolTable[sname.fun(func)] = new FunctionContext(this, func);
        this.finalize();
    }

    private finalize() {
        // this.instruction = []
        for (let func of this._symbolTable) {
            this.instructions.push({ code: EOperations.k_Label, args: [ new Label(func.name, this.instructions.length) ] });
            this.instructions.push(...func.instructions);
        }
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

class Constant implements IInstructionArgument {
    protected _value: number;

    constructor(val: number) {
        this._value = val;
    }

    resolve(ctx: ProgramContext): number {
        return this._value;
    }

    valueOf(): number { 
        return this._value; 
    }

    toString(): string {
        let v = this._value;
        return String(v);
    }
}

class Register extends Constant {
    toString(): string {
        let v = this._value;
        return REG_NAMES[v] || `[${hex2(v >>> 0)}]`;
    }

    isValid(): boolean {
        return this._value != REG_INVALID;
    }
}



class Addr extends Constant {
    toString(): string {
        let v = this._value;
        return `%${hex4(v >>> 0)}%`;
    }
}


class Label implements IInstructionArgument {
    protected _name: string;    // name of the label (function);
    protected _value: number;   // instruction address;

    constructor(sname: string, val: number = -1) {
        this._name = sname;
        this._value = val;
    }

    resolve(ctx: ProgramContext): number {
        if (!this.isValid()) {

        }
        return this._value;
    }

    valueOf(): number { 
        return this._value; 
    }

    toString(): string {
        return `${this._name}: `;
    }

    isValid(): boolean {
        return this._value != -1;
    }
}

const reg = (v: number) => new Register(v);
const addr = (v: number) => new Addr(v);
const num = (v: number) => new Constant(v);


class FunctionContext {
    readonly ctx: ProgramContext;
    readonly instructions: IOperation[];
    
    // same as stack pointer; 
    // counter grows forward;
    private _registerCounter: number;

    private _symbolTable: SymbolTable<Register>;

    private _func: IFunctionDeclInstruction;


    constructor (ctx: ProgramContext, func: IFunctionDeclInstruction) {
        this.ctx = ctx;
        this.instructions = [];

        this._registerCounter = 0;
        this._symbolTable = new SymbolTable<Register>();
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
    rcost(lit: ILiteralInstruction): Register {
        switch (lit.instructionType) {
            // assume only int32
            case EInstructionTypes.k_IntInstruction:
            {
                let i32 = (lit as IntInstruction).value;
                let r = this.deref(sname.i32(i32));
                if (!r.isValid()) {
                    r = this.alloca(sizeof.i32());
                    this.icode(EOperations.k_Load, r, addr(this.constants.checkInt32(i32)), num(sizeof.i32()));
                    this.ref(sname.i32(i32), r);
                }
                return r;
            }
            break;
            default:
                this.critical(EErrors.k_UnsupportedConstantType, {});
        }
        
        return reg(REG_INVALID); // todo: replace with constant
    }

    // assuming that all registers for all types are the same memory;
    alloca(size: number): Register {
        let rc = this._registerCounter;
        this._registerCounter += size;
        return reg(rc);
    }

    // insert code
    icode(code: EOperations, ...args: IInstructionArgument[]): void {
        this.instructions.push({ code, args });
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
                    return this.deref(sname.var(id.declaration as IVariableDeclInstruction));
                }
            case EInstructionTypes.k_ArithmeticExprInstruction:
                {
                    const arithExpr = expr as ArithmeticExprInstruction;
                    switch (arithExpr.operator) {
                        case '+':
                            let dest = this.alloca(arithExpr.type.size);
                            this.icode(EOperations.k_Add, dest, this.raddr(arithExpr.left), this.raddr(arithExpr.right));
                            return dest;
                        break;
                        default:
                            this.critical(EErrors.k_UnsupportedExprType, {});
                            return reg(REG_INVALID);
                    }
                }
            break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return reg(REG_INVALID);
        }
    }

    // add referene of the local variable
    ref(sname: string, r: Register) {
        assert(!isDef(this._symbolTable[sname]));
        this._symbolTable[sname] = r;
    }

    deref(sname: string): Register {
        // is zero register available?
        return isDef(this._symbolTable[sname])? this._symbolTable[sname] : reg(REG_INVALID);
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
                        this.icode(EOperations.k_Move, reg(REG_RAX), this.raddr(ret.expr));
                        this.icode(EOperations.k_Ret);
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