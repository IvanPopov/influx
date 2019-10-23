
import { assert, isDef, isDefAndNotNull } from "@lib/common";
import { DeclStmtInstruction } from "@lib/fx/instructions/DeclStmtInstruction";
import { ExprInstruction } from "@lib/fx/instructions/ExprInstruction";
import { Instruction } from "@lib/fx/instructions/Instruction";
import { ReturnStmtInstruction } from "@lib/fx/instructions/ReturnStmtInstruction";
import { VariableDeclInstruction } from "@lib/fx/instructions/VariableDeclInstruction";
import * as SystemScope from "@lib/fx/SystemScope";
import { T_FLOAT, T_INT } from "@lib/fx/SystemScope";
import { EChunkType, EMemoryLocation } from "@lib/idl/bytecode";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, IComplexExprInstruction, IConstructorCallInstruction, IExprInstruction, IExprStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPostfixPointInstruction, IScope, IStmtBlockInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { isNull, isString } from "util";
import ConstanPool from "./ConstantPool";
import { ContextBuilder, EErrors, IContext, TranslatorDiagnostics } from "./Context";
import { CdlRaw } from "./DebugLayout";
import PromisedAddress from "./PromisedAddress";
import sizeof from "./sizeof";

// symbol name id generation;
const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    f32: (f32: number) => `%f32:${f32}`,
    var: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`,
    fun: (fdecl: IFunctionDeclInstruction) => `${fdecl.name}:${fdecl.instructionID}`,

    addr: (addr: number) => sname.i32(addr)
};




export interface ISubProgram {
    code: Uint8Array;
    constants: ConstanPool;
    cdl: CdlRaw;
}

function translateSubProgram(ctx: IContext, fn: IFunctionDeclInstruction): ISubProgram {
    const { diag, constants, instructions, debug, alloca, push, pop } = ctx;

    // NOTE: it does nothing at the momemt :/
    debug.beginCompilationUnit('[todo]');

    // simulate function call()
    let ret = alloca(fn.definition.returnType.size);
    push(fn, ret);
    translateFunction(ctx, fn);
    pop();
    debug.endCompilationUnit();


    function constChunk(): ArrayBuffer {
        const mem = constants.data;
        const size = mem.byteLength >> 2;
        const chunkHeader = [EChunkType.k_Constants, size];
        assert((size << 2) == mem.byteLength);
        const data = new Uint32Array(chunkHeader.length + size);
        data.set(chunkHeader);
        data.set(new Uint32Array(mem.byteArray, 0, mem.byteLength >> 2), chunkHeader.length);
        return data.buffer;
    }


    function codeChunk(): ArrayBuffer {
        const chunkHeader = [EChunkType.k_Code, instructions.length];
        const data = new Uint32Array(chunkHeader.length + instructions.length);
        data.set(chunkHeader);
        data.set(instructions.data, chunkHeader.length);

        return data.buffer;
    }

    function binary(): Uint8Array {
        const chunks = [constChunk(), codeChunk()].map(ch => new Uint8Array(ch));
        const byteLength = chunks.map(x => x.byteLength).reduce((a, b) => a + b);
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

function translateFunction(ctx: IContext, func: IFunctionDeclInstruction) {
    const { diag, constants, alloca, loc, debug, push, pop, deref, ref, icode, imove, iload, ret, depth } = ctx;

    // NOTE: pc - number of written instructions
    // NOTE: rc - number of occupied registers

    const isEntryPoint = () => depth() === 1;

    // function rconst_addr(addr: number): number {
    //     let r = deref(sname.addr(addr));
    //     if (r == REG_INVALID) {
    //         r = alloca(sizeof.addr());
    //         icode(EOperation.k_I32LoadConst, r, constants.checkAddr(addr));
    //         ref(sname.addr(addr), r);
    //     }
    //     return r;
    // }


    function resolveMemoryLocation(decl: IVariableDeclInstruction): EMemoryLocation {
        if (decl.isParameter()) {
            if (decl.type.hasUsage('out') || decl.type.hasUsage('inout')) {
                // entry point function can refer to input memory, for ex. vertex shader
                return isEntryPoint() ? EMemoryLocation.k_Input : EMemoryLocation.k_Registers;
            }
        }

        if (decl.isGlobal()) {
            assert(false, 'unsupported');
        }

        assert(decl.isLocal());
        return EMemoryLocation.k_Registers;
    }

    const POSTFIX_COMPONENT_MAP = {
        'r': 0, 'x': 0, 's': 0,
        'g': 1, 'y': 1, 't': 1,
        'b': 2, 'z': 2, 'p': 2,
        'a': 3, 'w': 3, 'q': 3
    };

    function checkPostfixNameForSwizzling(postfixName: string): boolean {
        return postfixName
            .split('')
            .map(c => POSTFIX_COMPONENT_MAP[c])
            .map(i => i >= 0 && i < 4)
            .reduce((accum, val) => accum && val);
    }

    // xxwy => [0, 0, 3, 1]
    function swizzlePatternFromName(postfixName: string): number[] {
        return postfixName.split('').map(c => POSTFIX_COMPONENT_MAP[c]);
    }


    /** resolve address => returns address of temprary result of expression */
    function raddr(expr: IExprInstruction): PromisedAddress {
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
            case EInstructionTypes.k_BoolInstruction:
                {
                    const i32 = <boolean>(expr as ILiteralInstruction).value ? 1 : 0;
                    return constants.i32(i32);
                }
                break;
            case EInstructionTypes.k_IntInstruction:
                {
                    const i32 = <number>(expr as ILiteralInstruction).value;
                    return constants.i32(i32);
                }
                break;
            case EInstructionTypes.k_FloatInstruction:
                {
                    const f32 = <number>(expr as ILiteralInstruction).value;
                    return constants.f32(f32);
                }
                break;
            case EInstructionTypes.k_IdExprInstruction:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.declaration === ExprInstruction.UnwindExpr(id));

                    const size = id.declaration.type.size;
                    const decl = ExprInstruction.UnwindExpr(id);
                    const location = resolveMemoryLocation(decl);

                    switch (location) {
                        case EMemoryLocation.k_Registers:
                            {
                                const addr = deref(sname.var(id.declaration as IVariableDeclInstruction));
                                return addr;
                            }
                        case EMemoryLocation.k_Input:
                            {
                                // implies that each parameter is loaded from its stream, so 
                                // the offset is always zero. 
                                // Otherwise use 'VariableDeclInstruction.getParameterOffset(decl);'
                                // in order to determ correct offset between parameters
                                const offset = 0;
                                const src = offset;
                                const inputIndex = VariableDeclInstruction.getParameterIndex(decl);
                                return loc({ inputIndex, addr: src, size, location });
                            }
                    }

                    assert(false, 'unsupported branch found');
                    return PromisedAddress.INVALID;
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
                        return PromisedAddress.INVALID;
                    }

                    const leftAddr = raddr(arithExpr.left);
                    if (leftAddr.location !== EMemoryLocation.k_Registers) {
                        iload(leftAddr);
                        debug.map(arithExpr.left);
                    }

                    const rightAddr = raddr(arithExpr.right);
                    if (rightAddr.location !== EMemoryLocation.k_Registers) {
                        iload(rightAddr);
                        debug.map(arithExpr.right);
                    }

                    const size = arithExpr.type.size;
                    const dest = alloca(size);
                    icode(op, dest, leftAddr, rightAddr);
                    debug.map(arithExpr);
                    debug.ns();

                    return loc({ addr: dest, size });
                }
                break;
            case EInstructionTypes.k_CastExprInstruction:
                {
                    const castExpr = expr as ICastExprInstruction;

                    if (castExpr.isUseless()) {
                        console.warn(`Useless cast found: ${castExpr.toCode()}`);
                        return raddr(castExpr.expr);
                    }

                    const srcType = castExpr.expr.type;
                    const dstType = castExpr.type;

                    let op: EOperation;
                    if (srcType.isEqual(T_FLOAT) && dstType.isEqual(T_INT)) {
                        op = EOperation.k_F32ToI32;
                    } else if (srcType.isEqual(T_INT) && dstType.isEqual(T_FLOAT)) {
                        op = EOperation.k_I32ToF32;
                    } else {
                        // todo: add type descriptions
                        diag.critical(EErrors.k_UnsupoortedTypeConversion, {});
                        return PromisedAddress.INVALID;
                    }

                    const size = castExpr.type.size;
                    const dest = alloca(size);
                    icode(op, dest, raddr(castExpr.expr));
                    debug.map(castExpr);
                    return loc({ addr: dest, size });
                }
                break;
            case EInstructionTypes.k_PostfixPointInstruction:
                {
                    const point = expr as IPostfixPointInstruction;
                    const { element, postfix } = point;
                    const elementAddr = raddr(element);

                    let { size, padding } = postfix.type;
                    let swizzle: number[] = null;

                    // Does expression have dynamic indexing?
                    // todo: rename isConstExpr() method to something more suitable
                    if (point.isConstExpr()) {

                        // handle such types like float2, float3, int2, int3 etc.
                        // all system types except matrix and samplers support swizzling
                        const isSwizzlingSupported = SystemScope.isVectorType(element.type) ||
                            SystemScope.isScalarType(element.type);

                        if (isSwizzlingSupported) {
                            assert(checkPostfixNameForSwizzling(postfix.name));
                            swizzle = swizzlePatternFromName(postfix.name);

                            assert(padding === Instruction.UNDEFINE_PADDING, 'padding of swizzled components must be undefined');
                            padding = 0;
                        }

                        // If loading not allowed then we are inside the recursive call to calculate the final address
                        // so in this case we just have to return address with padding added to it.
                        return elementAddr.override({ offset: padding, size, swizzle });
                    }

                    assert(false, 'not implemented!');

                    // todo: add support for move_reg_ptr, move_ptr_ptr, move_ptr_reg
                    // if (padding > 0) {
                    //     const postfixReg = rconst_addr(padding);     // write element's padding to register
                    //     const elementReg = rconst_addr(elementAddr); // write element's addr to register
                    //     const destReg = alloca(sizeof.addr());
                    //     icode(EOperation.k_I32Add, destReg, elementReg, postfixReg);
                    //     debug.map(point);
                    //     return destReg; // << !!!! return addr!!!
                    // }

                    return elementAddr;
                }
                break;
            case EInstructionTypes.k_FunctionCallInstruction:
                {
                    const call = expr as IFunctionCallInstruction;
                    const fdecl = call.declaration as IFunctionDeclInstruction;
                    const fdef = fdecl.definition;

                    const ret = alloca(fdef.returnType.size);
                    push(fdecl, ret);

                    for (let i = 0; i < fdef.paramList.length; ++i) {
                        const param = fdef.paramList[i];
                        const arg = i < call.args.length ? call.args[i] : param.initExpr;
                        const src = raddr(arg);

                        // by default all parameters are interpreted as 'in'
                        if (param.type.hasUsage('out') || param.type.hasUsage('inout')) {
                            ref(sname.var(param), src);
                        } else {
                            // todo: handle expressions like "float4 v = 5.0;"
                            const size = param.type.size;
                            const dest = alloca(size);

                            imove(dest, src, size);
                            debug.map(arg);

                            ref(sname.var(param), dest);
                        }
                    }

                    translateFunction(ctx, fdecl);
                    pop();

                    return ret;
                }
                break;
            case EInstructionTypes.k_ConstructorCallInstruction:
                {
                    const ctorCall = expr as IConstructorCallInstruction;
                    // todo: add correct constructor call support for builtin type at the level of analyzer
                    const type = ctorCall.type;
                    const args = (ctorCall.arguments as IExprInstruction[]);

                    const size = type.size;
                    const dest = alloca(size);

                    switch (type.name) {
                        case 'float':
                        case 'float1':
                        case 'float2':
                        case 'float3':
                        case 'float4':
                            switch (args.length) {
                                case 1:
                                    // TODO: convert float to int if necessary
                                    // handling for the case single same type argument and multiple floats
                                    assert(Instruction.isExpression(args[0]));
                                    let src = raddr(args[0]);

                                    if (src.location !== EMemoryLocation.k_Registers) {
                                        iload(src);
                                        debug.map(args[0]);
                                    }

                                    // FIXME: use 'length' property
                                    let length = type.size / sizeof.f32();
                                    let swizzle = null;
                                    if (src.size === sizeof.f32()) {
                                        swizzle = [...Array(length).fill(0)];
                                    } else {
                                        swizzle = [...Array(length).keys()];
                                    }

                                    src = src.override({ swizzle });

                                    imove(dest, src, size);
                                    debug.map(ctorCall);
                                    break;
                                default:
                                    let offset = 0;
                                    for (let i = 0; i < args.length; ++i) {
                                        assert(Instruction.isExpression(args[i]));
                                        let src = raddr(args[i]);

                                        if (src.location !== EMemoryLocation.k_Registers) {
                                            iload(src);
                                            debug.map(args[i]);
                                        }

                                        imove(dest.override({ offset }), src);
                                        debug.map(ctorCall);
                                        offset += args[i].type.size;
                                    }
                                    break;

                            }
                            return loc({ addr: dest, size });
                        default:
                    }
                    console.warn(`Unknown constructor found: ${ctorCall.toCode()}`);
                    return PromisedAddress.INVALID;
                }
                break;
            default:
                console.warn(`Unknown expression found: ${EInstructionTypes[expr.instructionType]}`);
                return PromisedAddress.INVALID;
        }
    }




    // 
    // Handle all instruction types
    //

    function translate(instr: IInstruction) {
        if (isNull(instr)) {
            return;
        }

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

                    const dest = raddr(decl.initExpr);
                    if (dest.location !== EMemoryLocation.k_Registers) {
                        iload(dest);
                        debug.map(decl.initExpr);
                        debug.ns();
                    }

                    ref(sname.var(decl), dest);
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
                    let retStmt = instr as ReturnStmtInstruction;
                    const expr = retStmt.expr;
                    if (!isNull(expr)) {
                        const src = raddr(expr);

                        if (src.location !== EMemoryLocation.k_Registers) {
                            iload(src);
                            debug.map(expr);
                        }

                        const dest = ret();

                        assert(src.size === ret().size);
                        imove(dest, src);
                        debug.map(expr);
                        debug.ns();

                        icode(EOperation.k_Ret);
                        debug.map(retStmt);
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
                    const assigment = instr as IAssignmentExprInstruction;
                    const size = assigment.type.size;
                    assert(size % sizeof.i32() === 0);
                    assert(assigment.operator === '=');

                    // left address can be both from the registers and in the external memory
                    const leftAddr = raddr(assigment.left);

                    assert(Instruction.isExpression(assigment.right));
                    // right address always from the registers
                    const rightAddr = raddr(<IExprInstruction>assigment.right);
                    if (rightAddr.location !== EMemoryLocation.k_Registers) {
                        iload(rightAddr);
                        debug.map(assigment.right);
                    }

                    imove(leftAddr, rightAddr, size);
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
        func = scope.findFunction(fname, null);
    } else {
        func = argv[0];
    }

    let ctx = ContextBuilder();
    let res: ISubProgram = null;

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