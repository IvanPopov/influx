import { assert, isDef } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { REG_INVALID } from "./common";
import debugLayout from './DebugLayout';
import InstructionList from "./InstructionList";
import PromisedAddress, { IAddrDesc } from "./PromisedAddress";
import autobind from "autobind-decorator";

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
        ret: PromisedAddress;

        // addresses of function return instructions to be resolved
        jumpList: number[];
    }[] = [];

    // global symbol table for all constants loaded during bytecode generation process
    constants = new SymbolTable<number>();
    instructions = new InstructionList;
    debug = null;

    constructor() {
        // todo: make api less messy
        this.debug = debugLayout(this.pc);
    }

    /** @returns Description of the top of the callstack */
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

    @autobind
    ret(): PromisedAddress {
        return this.top.ret;
    }


    @autobind
    pc(): number {
        return this.instructions.pc;
    }


    @autobind
    isEntryPoint(): boolean {
        return this.depth === 1;
    }


    /* (assuming that all registers for all types are placed in the same memory) */
    @autobind
    alloca(size: number): PromisedAddress {
        let rc = this.rc;
        this.rc += size;
        return this.loc({ addr: rc, size });
    }


    /** insert code */
    @autobind
    icode(code: EOperation, ...args: Array<number | PromisedAddress>): void {
        if (code === EOperation.k_Ret) {
            // add the instruction address to the description of the
            // function on the top of the colstack; when the code
            // generation for this function is completed, all return
            // instructions must receive the correct addresses for
            // jumping to the end of the function
            this.addReturn();
        }
        // add this instruction to debug layout;
        this.debug.step();
        // todo: make this call chain less messy :/
        this.instructions.add(code, args.map(arg => Number(arg)));
    }


    @autobind
    loc(desc: IAddrDesc) {
        return new PromisedAddress(this, desc);
    }

    /**
     * Add referene of the local variable.
     * @param sname Variable name or hash.
     * @param r Register number.
     */
    @autobind
    ref(sname: string, r: number | PromisedAddress): void {
        assert(!isDef(this.symbols[sname]));
        this.symbols[sname] = Number(r);
    }


    /**
     * @returns Register address of variable/constant or REG_INVALID.
     * @param sname 
     */
    @autobind
    deref(sname: string, size: number): PromisedAddress {
        // is zero register available?
        for (let i = this.depth - 1; i >= 0; --i) {
            let symbols = this.stack[i].symbols;
            if (isDef(symbols[sname])) {
                return this.loc({addr: symbols[sname], size});
            }
        }
        return PromisedAddress.INVALID;
    }


    /** Same as ref but for constants only */
    @autobind
    cref(sname: string, r: number | PromisedAddress): void {
        assert(!isDef(this.constants[sname]));
        this.constants[sname] = Number(r);
    }


    /** Derederence for constants */
    @autobind
    cderef(sname: string, size: number): PromisedAddress {
        // is zero register available?
        if (isDef(this.constants[sname])) {
            return this.loc({ addr: this.constants[sname], size });
        }

        return PromisedAddress.INVALID;
    }


    /** @returns Address of the return value. */
    @autobind
    push(fn: IFunctionDeclInstruction, ret: PromisedAddress): void {
        const symbols = new SymbolTable<number>();
        const rc = this.rc;
        const pc = this.instructions.pc;
        const jumpList = [];
        this.stack.push({ fn, symbols, rc, ret, pc, jumpList });
    }


    @autobind
    pop(): void {
        const entryPoint = this.isEntryPoint();
        const entry = this.stack.pop();
        // updating all return adresses to correct values
        if (!entryPoint) {
            entry.jumpList.forEach(pc => this.instructions.replace(pc, EOperation.k_Jump, [this.instructions.pc]));
        }
        this.rc = entry.rc;
    }


    // next operation will be 'k_Ret'
    private addReturn() {
        this.top.jumpList.push(this.instructions.pc);
    }

}

export type ICallstack = Callstack;


export default Callstack;