import { assert, isDef } from "@lib/common";
import { EMemoryLocation } from "@lib/idl/bytecode";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { Diagnostics } from "@lib/util/Diagnostics";
import autobind from "autobind-decorator";
import ConstanPool from "./ConstantPool";
import debugLayout from './DebugLayout';
import InstructionList from "./InstructionList";
import PromisedAddress, { IAddrDesc } from "./PromisedAddress";
import sizeof from "./sizeof";
import { IRange } from "@lib/idl/parser/IParser";


export enum EErrors {
    k_UnsupportedConstantType,
    k_UnsupportedExprType,
    k_UnsupoortedTypeConversion,
    k_UnsupportedArithmeticExpr
}


// FIXME: don't use 'any' type
type ITranslatorDiagDesc = any;

export class TranslatorDiagnostics extends Diagnostics<ITranslatorDiagDesc> {
    constructor() {
        super("Translator Diagnostics", 'T');
    }

    protected resolveFilename(code: number, desc: ITranslatorDiagDesc): string {
        return '[unknown]';  // FIXME: return correct filename
    }

    protected resolveRange(code: number, desc: ITranslatorDiagDesc): IRange {
        return { start: { line: 0, column: 0, file: null }, end: { line: 0, column: 0, file: null } }; // todo: fixme
    }

    protected diagnosticMessages() {
        return {};
    }
}



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


export function ContextBuilder() {
    // occupied registers count 
    // same as stack pointer; 
    // counter grows forward;
    let rc: number = 0;

    const stack: {
        fn: IFunctionDeclInstruction;
        // symbol table containing local variables of the function including parameters
        symbols: SymbolTable<PromisedAddress>;
        // registers count at the moment of function's call
        rc: number;
        // program counter's value before the function's start 
        pc: number;
        // address of register where return call should save its value
        ret: PromisedAddress;

        // addresses of function return instructions to be resolved
        retRequests: number[];
    }[] = [];

    // global symbol table for all constants loaded during bytecode generation process
    const constSymbols = new SymbolTable<PromisedAddress>();
    const instructions = new InstructionList;
    const constants = new ConstanPool;
    
    const diag = new TranslatorDiagnostics; // todo: remove it?
    
    
    /** @returns Description of the top of the callstack */
    const top = () => stack[depth() - 1];
    const depth = () => stack.length;
    const fn = () => top().fn;
    /** Symbol table of the function at the top of the callstack */
    const symbols = () => top().symbols;
    const ret = () => top().ret;
    const pc = () => instructions.pc;
    const loc = (desc: IAddrDesc) => new PromisedAddress(desc);
    // const consti32 = (i32: number) => constants.i32(i32);
    // const constf32 = (f32: number) => constants.f32(f32);
    
    const debug = debugLayout(pc);

    /* (assuming that all registers for all types are placed in the same memory) */
    function alloca(size: number): PromisedAddress {
        let addr = rc;
        rc += size;
        return loc({ addr, size });
    }


    /** insert code */
    function icode(code: EOperation, ...args: Array<number | PromisedAddress>): void {
        if (code === EOperation.k_Ret) {
            // add the instruction address to the description of the
            // function on the top of the colstack; when the code
            // generation for this function is completed, all return
            // instructions must receive the correct addresses for
            // jumping to the end of the function
            addReturn();
        }
        // add this instruction to debug layout;
        debug.step();
        // todo: make this call chain less messy :/
        instructions.add(code, args.map(arg => Number(arg)));
    }


    /**
     * Write something to this location/address
     * @param src Source address.
     * @param size Size of the source location.
     */
    function imove(dest: PromisedAddress, src: PromisedAddress, size: number = 0): void {
        if (size === 0) {
            size = src.size;
        }

        assert(src.size <= size,
            `source size is ${(src as PromisedAddress).size} and less then the requested size ${size}.`);
        assert(dest.size >= size, `expected size is ${dest.size}, but given is ${size}`);

        switch (dest.location) {
            case EMemoryLocation.k_Registers:
                {
                    switch (src.location) {
                        case EMemoryLocation.k_Registers:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.location === EMemoryLocation.k_Registers);
                            assert(src.location === EMemoryLocation.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32MoveRegToReg,
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(), 
                                    src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        case EMemoryLocation.k_Input:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.location === EMemoryLocation.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadInput, src.inputIndex, 
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(), 
                                    src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        case EMemoryLocation.k_Constants:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.location === EMemoryLocation.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadConst,
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(), 
                                    src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        default:
                            assert(false, 'unsupported memory type found.');
                    }
                }
                break;

            case EMemoryLocation.k_Input:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                assert(src.location === EMemoryLocation.k_Registers);
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    icode(EOperation.k_I32StoreInput, dest.inputIndex,
                        dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(), 
                        src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                }
                break;
            default:
                assert(false, 'unsupported memory type found.');
        }
    }



    /**
     * Resolve/move this address/region to registers
     */
    function iload(src: PromisedAddress): void {
        assert(src.location !== EMemoryLocation.k_Registers);
        if (src.location === EMemoryLocation.k_Registers) {
            return;
        }

        let dest: PromisedAddress = null;
        // Special case for constants
        // Implementation of the global caching for all constantns across the program
        if (src.location === EMemoryLocation.k_Constants) {
            dest = cderef(src);
            if (dest === PromisedAddress.INVALID) {
                dest = alloca(src.size);
                imove(dest, src);
                cref(src, dest);
            }
        } else {
            dest = alloca(src.size);
            imove(dest, src);
        }

        

        src.location = dest.location;
        src.addr = dest.addr;
        src.inputIndex = undefined;
    }


 

    /**
     * Add referene of the local variable.
     * @param sname Variable name or hash.
     * @param src Register number.
     */
    function ref(sname: string, src: PromisedAddress): void {
        assert(src.location === EMemoryLocation.k_Registers);
        assert(!isDef(symbols()[sname]));
        symbols()[sname] = loc(src);
    }


    /**
     * @returns Register address of variable/constant or REG_INVALID.
     * @param sname 
     */
    function deref(sname: string): PromisedAddress {
        // is zero register available?
        for (let i = depth() - 1; i >= 0; --i) {
            let symbols = stack[i].symbols;
            if (isDef(symbols[sname])) {
                return symbols[sname];
            }
        }
        return PromisedAddress.INVALID;
    }


    /** Same as ref but for constants only */
    function cref(caddr: PromisedAddress, raddr: PromisedAddress): void {
        assert(raddr.location === EMemoryLocation.k_Registers &&
            caddr.location === EMemoryLocation.k_Constants);
        assert(!isDef(constSymbols[caddr.addr]));
        constSymbols[caddr.addr] = loc(raddr);
    }


    /** Derederence for constants */
    function cderef(src: PromisedAddress): PromisedAddress {
        assert(src.location === EMemoryLocation.k_Constants);
        return constSymbols[src.addr] || PromisedAddress.INVALID;
    }


    /** @returns Address of the return value. */
    function push(fn: IFunctionDeclInstruction, ret: PromisedAddress): void {
        const symbols = new SymbolTable<PromisedAddress>();
        const pc = instructions.pc;
        const jumpList = [];
        stack.push({ fn, symbols, rc, ret, pc, retRequests: jumpList });
    }


    function pop(): void {
        const entryPoint = depth() === 1;
        const entry = stack.pop();
        // updating all return adresses to correct values
        if (!entryPoint) {
            entry.retRequests.forEach(pc => instructions.replace(pc, EOperation.k_Jump, [instructions.pc]));
        }
        rc = entry.rc;
    }


    // next operation will be 'k_Ret'
    function addReturn() {
        top().retRequests.push(pc());
    }

    return { 
        pc, 
        loc, 
        instructions, 
        debug, 
        deref, 
        ref, 
        cderef, 
        cref, 
        alloca, 
        icode, 
        imove, 
        iload, 
        push,
        pop,
        ret, 
        constants, 
        depth,
        diag
    };
}

export type IContext = ReturnType<typeof ContextBuilder>;
