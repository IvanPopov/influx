import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import InstructionList from "@lib/fx/bytecode/InstructionList";
import { isDef, assert } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { REG_INVALID } from "@lib/fx/bytecode/common";

/**
 * A simplified symbol table containing the correspondence of unique 
 * hashes of symbols and their addresses in registers.
 * The table is global and does not depend on the stack of functions, 
 * because hashes are built on the basis of identifiers of instructions 
 * unique to each function and context.
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
    // occupied registers count 
    // same as stack pointer; 
    // counter grows forward;
    rc: number = 0;

    stack: {
        fn: IFunctionDeclInstruction;
        // symbol table containing local variables of the function including parameters
        symbols: SymbolTable<number>;
        // registers count at the moment of function's call
        rc: number;
        // program counter's value before the function's start 
        pc: number;
        // address of register where return call should save its value
        ret: number;

        // addresses of function return instructions to be resolved
        jumpList: number[];
    }[] = [];

    // global symbol table for all constants loaded during bytecode generation process
    constants: SymbolTable<number> = new SymbolTable<number>();

    // todo: rework this api (make it more explicit)
    constructor(private ilist: InstructionList) {

    }

    private get top() {
        return this.stack[this.depth - 1];
    }

    private get depth(): number {
        return this.stack.length;
    }

    get fn(): IFunctionDeclInstruction {
        return this.top.fn;
    }

    /** Symbol table of the function at the top of the callstack */
    get symbols(): SymbolTable<number> {
        return this.top.symbols;
    }

    get ret(): number {
        return this.top.ret;
    }

    isEntryPoint(): boolean {
        return this.depth === 1;
    }

    // next operation will be 'k_Ret'
    addReturn() {
        this.top.jumpList.push(this.ilist.pc);
    }

    /* (assuming that all registers for all types are placed in the same memory) */
    alloca(size: number) {
        let rc = this.rc;
        this.rc += size;
        return rc;
    }

    /**
     * Add referene of the local variable.
     * @param sname Variable name or hash.
     * @param r Register number.
     */
    ref(sname: string, r: number): void {
        assert(!isDef(this.symbols[sname]));
        this.symbols[sname] = r;
    }

    /**
     * @returns Register address of variable/constant or REG_INVALID.
     * @param sname 
     */
    deref(sname: string): number {
        // is zero register available?
        for (let i = this.depth - 1; i >= 0; --i) {
            let symbols = this.stack[i].symbols;
            if (isDef(symbols[sname])) {
                return symbols[sname];
            }
        }
        return REG_INVALID;
    }

    /** Same as ref but for constants only */
    cref(sname: string, r: number): void {
        assert(!isDef(this.constants[sname]));
        this.constants[sname] = r;
    }

    /** Derederence for constants */
    cderef(sname: string): number {
        // is zero register available?
        return isDef(this.constants[sname]) ? this.constants[sname] : REG_INVALID;
    }

    /** @returns Address of the return value. */
    push(fn: IFunctionDeclInstruction): number {
        // reserve memory for the return value
        const ret = this.alloca(fn.definition.returnType.size);
        const symbols = new SymbolTable<number>();
        const rc = this.rc;
        const pc = this.ilist.pc;
        const jumpList = [];
        this.stack.push({ fn, symbols, rc, ret, pc, jumpList });
        return ret;
    }

    pop(): void {
        const entryPoint = this.isEntryPoint();
        const entry = this.stack.pop();
        // updating all return adresses to correct values
        if (!entryPoint) {
            entry.jumpList.forEach(pc => this.ilist.replace(pc, EOperation.k_Jump, [this.ilist.pc]));
        }
        this.rc = entry.rc;
    }
}


export default Callstack;