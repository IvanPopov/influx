import { assert, isDef, isNull, isString, isNumber, isDefAndNotNull } from "@lib/common";
import { EAddrType } from "@lib/idl/bytecode";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IFunctionDeclInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";

import { variable } from "../analisys/helpers";
import { f32Asi32, sname } from "./common";
import ConstanPool from "./ConstantPool";
import debugLayout from './DebugLayout';
import InstructionList from "./InstructionList";
import PromisedAddress, { IAddrDesc } from "./PromisedAddress";
import sizeof from "./sizeof";
import SymbolTable from "./SymbolTable";
import { UAVPool } from "./UAVPool";
import { EDiagnosticCategory } from "@lib/idl/IDiagnostics";

export enum EErrors {
    k_UnsupportedConstantType,
    k_UnsupportedExprType,
    k_UnsupoortedTypeConversion,
    k_UnsupportedArithmeticExpr,
    k_UnsupportedRelationalExpr
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


    protected resolveDescription(code: number, category: EDiagnosticCategory, desc: any): string {
        let { ...data } = desc;
        if (category == EDiagnosticCategory.k_Warning) {
            return `warning: ${JSON.stringify(data)}`;
        }
        return `${EErrors[code]}: ${JSON.stringify(data)}`;
    }
}



export function ContextBuilder() {
    // occupied registers count 
    // same as stack pointer; 
    // counter grows forward;
    let rc: number = 0;

    // stack of functions and logical blocks for ex: braces.
    const stack: {
        scopes: {
            // symbol table containing local variables of the function including parameters
            symbols: SymbolTable<PromisedAddress>;
            // registers count at the moment of block's entry
            rc: number;
        }[];

        // program counter's value before the function's start 
        pc: number; // << NOTE: currently is unsed
        
        fn: IFunctionDeclInstruction;
        // address of register where return call should save its value
        ret: PromisedAddress;
        // addresses of function return instructions to be resolved
        retRequests: number[];
    }[] = [];


    const instructions = new InstructionList;
    const constants = new ConstanPool;
    const uavs = new UAVPool;

    const diag = new TranslatorDiagnostics; // todo: remove it?


    /** @returns Description of the top of the callstack */
    const top = () => stack[stack.length - 1];
    const depth = () => stack.length;
    const ret = () => top().ret;
    const pc = () => instructions.pc;
    const loc = (desc: IAddrDesc) => new PromisedAddress(desc);

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
        instructions.add(code, args.map(Number));
    }

    /**
     * Apply per component operation between two register-based adresses
     * op(a[i])
     */
    function iop1(op: EOperation, a: PromisedAddress, size: number = 0): void {
        if (size === 0) {
            size = a.size;
        }

        assert(a.type === EAddrType.k_Registers);

        for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
            icode(op, a.addr + (a.swizzle ? a.swizzle[i] : i) * sizeof.i32());
        }
    }

    /**
     * Apply per component operation between two register-based adresses
     * a[i] = op(b[i])
     */
    function iop2(op: EOperation, a: PromisedAddress, b: PromisedAddress, size: number = 0): void {
        if (size === 0) {
            size = b.size;
        }

        assert(a.type === EAddrType.k_Registers);
        assert(b.type === EAddrType.k_Registers);

        for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
            icode(op,
                a.addr + (a.swizzle ? a.swizzle[i] : i) * sizeof.i32(),
                b.addr + (b.swizzle ? b.swizzle[i] : i) * sizeof.i32());
        }
    }


    /**
     * Apply per component operation between two register-based adresses
     * dest[i] = op(a[i], b[i])
     */
    function iop3(op: EOperation, dest: PromisedAddress, a: PromisedAddress, b: PromisedAddress, size: number = 0): void {
        if (size === 0) {
            // TODO: use min(left.size, right.size) ?
            size = dest.size;
        }

        assert(dest.type === EAddrType.k_Registers);
        assert(a.type === EAddrType.k_Registers);
        assert(b.type === EAddrType.k_Registers);

        for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
            icode(op,
                dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                a.addr + (a.swizzle ? a.swizzle[i] : i) * sizeof.i32(),
                b.addr + (b.swizzle ? b.swizzle[i] : i) * sizeof.i32());
        }
    }


    /**
     * Apply per component operation between two register-based adresses
     * dest[i] = op(a[i], b[i], c[i])
     */
    function iop4(op: EOperation, dest: PromisedAddress, a: PromisedAddress, b: PromisedAddress, c: PromisedAddress, size: number = 0): void {
        if (size === 0) {
            // TODO: use min(left.size, right.size) ?
            size = dest.size;
        }

        assert(dest.type === EAddrType.k_Registers);
        assert(a.type === EAddrType.k_Registers);
        assert(b.type === EAddrType.k_Registers);
        assert(c.type === EAddrType.k_Registers);

        for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
            icode(op,
                dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                a.addr + (a.swizzle ? a.swizzle[i] : i) * sizeof.i32(),
                b.addr + (b.swizzle ? b.swizzle[i] : i) * sizeof.i32(),
                c.addr + (c.swizzle ? c.swizzle[i] : i) * sizeof.i32());
        }
    }

    /**
     * Write something to this location/address
     * @param src Source address.
     * @param size Size of the source location.
     */
    function imove(dest: PromisedAddress, src: PromisedAddress, size: number = 0): PromisedAddress {
        if (size === 0) {
            size = src.size;
        }

        assert(src.size <= size,
            `source size is ${(src as PromisedAddress).size} and less then the requested size ${size}.`);
        // TODO: check ranges with swizzles!
        assert(dest.size >= size, `expected size is ${dest.size}, but given is ${size}`);

        switch (dest.type) {
            case EAddrType.k_Registers:
                {
                    switch (src.type) {
                        case EAddrType.k_Registers:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.type === EAddrType.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadRegister,
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                                    src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        case EAddrType.k_Input:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.type === EAddrType.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadInput, src.inputIndex,
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                                    src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        case EAddrType.k_PointerRegisters:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.type === EAddrType.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadRegistersPointer,
                                    // destination register
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                                    // source pointer
                                    src.addr,
                                    // pointer offset
                                    (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        case EAddrType.k_PointerInput:
                            assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                            assert(dest.type === EAddrType.k_Registers);
                            for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                                icode(EOperation.k_I32LoadInputPointer, 
                                    src.inputIndex,
                                    // destination register
                                    dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                                    // source pointer
                                    src.addr, 
                                    // pointer offset
                                    (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                            }
                            break;
                        default:
                            assert(false, 'unsupported memory type found.');
                    }
                }
                break;

            case EAddrType.k_Input:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                assert(src.type === EAddrType.k_Registers);
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    icode(EOperation.k_I32StoreInput, dest.inputIndex,
                        dest.addr + (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32(),
                        src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32());
                }
                break;
            case EAddrType.k_PointerInput:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                assert(src.type === EAddrType.k_Registers);
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    icode(EOperation.k_I32StoreInputPointer, dest.inputIndex,
                        // destination pointer
                        dest.addr,
                        // source register
                        src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32(),
                        // destination offset
                        (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32());
                }
                break;
            case EAddrType.k_PointerRegisters:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                assert(src.type === EAddrType.k_Registers);
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    icode(EOperation.k_I32StoreRegisterPointer,
                        // destination pointer
                        dest.addr,
                        // source register
                        src.addr + (src.swizzle ? src.swizzle[i] : i) * sizeof.i32(),
                        // destination offset
                        (dest.swizzle ? dest.swizzle[i] : i) * sizeof.i32());
                }
                break;
            default:
                assert(false, 'unsupported memory type found.');
        }

        return dest;
    }



    /**
     * Resolve/move this address/region to registers
     */
    function iload(src: PromisedAddress): PromisedAddress {
        assert(src.type !== EAddrType.k_Registers);
        return imove(alloca(src.size), src);
    }


    const I32_HINT = 0;
    const F32_HINT = 1;
    // hint: 0 -> i32, 1 -> f32 (hints for bytecode viewer only)
    function iset(dest: PromisedAddress, i32: number, i32Hint: 0 | 1): PromisedAddress {
        assert(dest.type === EAddrType.k_Registers);
        icode(EOperation.k_I32SetConst, dest.addr + (dest.swizzle ? dest.swizzle[0] : 0) * sizeof.i32(), i32, i32Hint);
        return dest;
    }


    function iconst_i32(i32: number): PromisedAddress {
        return iset(alloca(sizeof.i32()), i32, I32_HINT);
    }

    function iconst_f32(f32: number): PromisedAddress {
        return iset(alloca(sizeof.f32()), f32Asi32(f32), F32_HINT);
    }


    /**
     * Add referene of the local variable.
     * @param decl Variable declaration.
     * @param src Register number.
     */
    function ref(decl: IVariableDeclInstruction, src: PromisedAddress): void {
        const name = sname.var(decl);
        assert(src.type === EAddrType.k_Registers);

        const scopes = top().scopes;
        const symbols = scopes[scopes.length - 1].symbols;
        assert(!isDef(symbols[name]));
        symbols[name] = src;
    }


    /**
     * @returns Register address of variable/constant or REG_INVALID.
     * @param decl
     */
    function deref(decl: IVariableDeclInstruction): PromisedAddress {
        const name = sname.var(decl);
        // is zero register available?
        for (let iFn = stack.length - 1; iFn >= 0; --iFn) {
            const scopes = stack[iFn].scopes;
            for (let iScope = scopes.length - 1; iScope >= 0; --iScope) {
                const symbols = scopes[iScope].symbols;
                if (isDef(symbols[name])) {
                    return symbols[name];
                }
            }
        }
        assert(false, `cannot dereference varaible ${name} (${decl.toCode()})`);
        return PromisedAddress.INVALID;
    }


    /** @returns Address of the return value. */
    function push(fn: IFunctionDeclInstruction, ret: PromisedAddress): void {
        const pc = instructions.pc;
        const retRequests = [];
        const scopes = [];
        stack.push({ fn, scopes, ret, pc, retRequests });
        open();
    }


    function pop(): void {
        // check that there are no non-closed blocks left inside the function
        assert(top().scopes.length === 1);
        close();

        const entry = stack.pop();

        const entryPoint = stack.length === 0;
        // updating all return adresses to correct values
        if (!entryPoint) {
            entry.retRequests.forEach(pc => instructions.replace(pc, EOperation.k_Jump, [instructions.pc]));
            //                                                                          ^^^^^^^^^^^^^^^^^
            //                                                     instruction immediately after function
        }
    }

    /** Open new block */
    function open() {
        const symbols = new SymbolTable<PromisedAddress>();
        top().scopes.push({ symbols, rc });
    }


    /** CLose last block */
    function close() {
        const scope = top().scopes.pop();
        rc = scope.rc;
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
        alloca,
        icode,
        imove,
        iload,
        iconst_i32,
        iconst_f32,
        iop4,
        iop3,
        iop2,
        iop1,
        push,
        pop,
        open,
        close,
        ret,
        constants,
        uavs,
        depth,
        diag
    };
}

export type IContext = ReturnType<typeof ContextBuilder>;
