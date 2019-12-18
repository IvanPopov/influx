import { assert, isDef, isDefAndNotNull, isNull } from "@lib/common";
import { DeclStmtInstruction } from "@lib/fx/analisys/instructions/DeclStmtInstruction";
import { expression, instruction, variable } from "@lib/fx/analisys/instructions/helpers";
import { Instruction } from "@lib/fx/analisys/instructions/Instruction";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { T_FLOAT, T_INT, T_UINT } from "@lib/fx/analisys/SystemScope";
import { EChunkType, EMemoryLocation } from "@lib/idl/bytecode";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, IComplexExprInstruction, IConstructorCallInstruction, IExprInstruction, IExprStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IInitExprInstruction, IInstruction, ILiteralInstruction, IPostfixPointInstruction, IRelationalExprInstruction, IScope, IStmtBlockInstruction, IUnaryExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { i32ToU8Array } from "./common";
import ConstanPool from "./ConstantPool";
import { ContextBuilder, EErrors, IContext, TranslatorDiagnostics } from "./Context";
import { CdlRaw } from "./DebugLayout";
import PromisedAddress from "./PromisedAddress";
import sizeof from "./sizeof";

export interface ISubProgram {
    code: Uint8Array;
    constants: ConstanPool;
    cdl: CdlRaw;
}

function translateSubProgram(ctx: IContext, fn: IFunctionDeclInstruction): ISubProgram {
    const { constants, instructions, debug, alloca, push, pop, loc, imove, ref } = ctx;

    // NOTE: it does nothing at the momemt :/
    debug.beginCompilationUnit('[todo]');
    // simulate function call()
    const fdef = fn.def;
    let ret = alloca(fdef.returnType.size);
    push(fn, ret);

    // TODO: use the same code as FunctionCall;
    // loading of all non-inpt parameters to registers
    for (let i = 0; i < fdef.params.length; ++i) {
        const param = fdef.params[i];
        if (param.type.hasUsage('out') || param.type.hasUsage('inout')) {
            continue;
        }

        const inputIndex = variable.getParameterIndex(param);
        const size = param.type.size;
        const src = loc({ location: EMemoryLocation.k_Input, inputIndex, addr: 0, size });
        const dest = alloca(size);
        imove(dest, src, size);
        debug.map(fdef); // FIXME: is it ok?
        ref(param, dest);
    }

    translateFunction(ctx, fn);
    pop();
    debug.endCompilationUnit();

    // TODO: rewrite with cleaner code
    function constLayoutChunk(): ArrayBuffer {
        const layout = constants.layout;
        const byteLength = 4/* names.length */ + layout.names.map(entry => entry.name.length + 8/* sizeof(name.length) + sizeof(addr)*/).reduce((prev, curr) => prev + curr, 0);
        const size = (byteLength + 4) >> 2;
        const chunkHeader = [EChunkType.k_Layout, size];
        const data = new Uint32Array(chunkHeader.length + size);
        data.set(chunkHeader);

        const u8data = new Uint8Array(data.buffer, 8/* int header type + int size */);
        let written = 0;
        u8data.set(i32ToU8Array(layout.names.length), written);
        written += 4;
        for (let i = 0; i < layout.names.length; ++i) {
            let { name, offset } = layout.names[i];
            u8data.set(i32ToU8Array(name.length), written);
            written += 4;
            u8data.set(name.split('').map(c => c.charCodeAt(0)), written);
            written += name.length;
            u8data.set(i32ToU8Array(offset), written);
            written += 4;
        }
        // console.log('after write', u8data.length, 'bytes', written);
        return data.buffer;
    }

    function constChunk(): ArrayBuffer {
        const mem = constants.data;
        const size = mem.byteLength >> 2;
        const chunkHeader = [EChunkType.k_Constants, size];
        assert((size << 2) == mem.byteLength);
        const data = new Uint32Array(chunkHeader.length + size);
        data.set(chunkHeader);
        data.set(new Uint32Array(mem.byteArray.buffer, 0, mem.byteLength >> 2), chunkHeader.length);
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
        const chunks = [constLayoutChunk(), constChunk(), codeChunk()].map(ch => new Uint8Array(ch));
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
    const {
        diag,
        constants,
        alloca,
        loc,
        debug,
        push,
        pop,
        deref,
        ref,
        icode,
        imove,
        iop3,
        iop2,
        iload,
        ret,
        depth
    } = ctx;

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

    type ArithmeticOp = IArithmeticExprInstruction['operator'];

    const intrinsics = {

        /**
         * Float based arithmetics
         * vector [op] vector | vector [op] scalar | scalar [op] vector
         */
        arithf(opName: ArithmeticOp, dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            const size = Math.max(left.size, right.size);
            const n = size / sizeof.f32();

            // handle case: scalar * vector => scalar.xxxx * vector
            if (left.size != right.size) {
                if (left.size === sizeof.f32()) {
                    left = left.override({ size: right.size, swizzle: Array(n).fill(0) });
                } else if (right.size === sizeof.f32()) {
                    right = right.override({ size: left.size, swizzle: Array(n).fill(0) });
                } else {
                    assert(false, 'vectors with differen length cannot be multipled');
                }
            }

            const opFloatMap = {
                '+': EOperation.k_F32Add,
                '-': EOperation.k_F32Sub,
                '*': EOperation.k_F32Mul,
                '/': EOperation.k_F32Div
            };

            const op: EOperation = opFloatMap[opName];
            if (!isDef(op)) {
                diag.critical(EErrors.k_UnsupportedArithmeticExpr, {});
                return PromisedAddress.INVALID;
            }

            iop3(op, dest, left, right);
            return dest;
        },

        // TODO: merhe with function above
        arithi(opName: ArithmeticOp, dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            const size = Math.max(left.size, right.size);
            const n = size / sizeof.f32();

            // handle case: scalar * vector => scalar.xxxx * vector
            if (left.size !== right.size) {
                if (left.size === sizeof.f32()) {
                    left = left.override({ size: right.size, swizzle: Array(n).fill(0) });
                } else if (right.size === sizeof.f32()) {
                    right = right.override({ size: right.size, swizzle: Array(n).fill(0) });
                } else {
                    assert(false, 'vectors with differen length cannot be multipled');
                }
            }

            const opIntMap = {
                '+': EOperation.k_I32Add,
                '-': EOperation.k_I32Sub,
                '*': EOperation.k_I32Mul,
                '/': EOperation.k_I32Div
            }

            const op: EOperation = opIntMap[opName];
            if (!isDef(op)) {
                diag.critical(EErrors.k_UnsupportedArithmeticExpr, {});
                return PromisedAddress.INVALID;
            }

            iop3(op, dest, left, right);
            return dest;
        },

        arith(opName: ArithmeticOp, dest: PromisedAddress, left: IExprInstruction, right: IExprInstruction): PromisedAddress {
            assert(SystemScope.isScalarType(left.type) || SystemScope.isVectorType(left.type));
            assert(SystemScope.isScalarType(right.type) || SystemScope.isVectorType(right.type));

            let leftAddr = raddr(left);
            if (leftAddr.location !== EMemoryLocation.k_Registers) {
                leftAddr = iload(leftAddr);
                debug.map(left);
            }

            let rightAddr = raddr(right);
            if (rightAddr.location !== EMemoryLocation.k_Registers) {
                rightAddr = iload(rightAddr);
                debug.map(right);
            }

            if (SystemScope.isFloatBasedType(left.type)) {
                assert(SystemScope.isFloatBasedType(right.type));
                return intrinsics.arithf(opName, dest, leftAddr, rightAddr);
            }

            if (SystemScope.isIntBasedType(left.type)) {
                assert(SystemScope.isIntBasedType(right.type));
                return intrinsics.arithi(opName, dest, leftAddr, rightAddr);
            }

            assert(false);
            return PromisedAddress.INVALID;
        },

        mulf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('*', dest, left, right),
        divf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('/', dest, left, right),
        addf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('+', dest, left, right),
        subf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('-', dest, left, right),

        mul: (dest: PromisedAddress, left: IExprInstruction, right: IExprInstruction) => intrinsics.arith('*', dest, left, right),
        div: (dest: PromisedAddress, left: IExprInstruction, right: IExprInstruction) => intrinsics.arith('/', dest, left, right),
        add: (dest: PromisedAddress, left: IExprInstruction, right: IExprInstruction) => intrinsics.arith('+', dest, left, right),
        sub: (dest: PromisedAddress, left: IExprInstruction, right: IExprInstruction) => intrinsics.arith('-', dest, left, right),

        dotf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            let temp = alloca(Math.max(left.size, right.size));
            let mlr = intrinsics.mulf(temp, left, right);
            let n = mlr.size / sizeof.f32();

            imove(dest, mlr.override({ size: sizeof.f32() }));
            for (let i = 1; i < n; ++i) {
                let offset = i * sizeof.f32();
                let size = sizeof.f32();
                intrinsics.addf(dest, dest, mlr.override({ offset, size }));
            }

            return dest;
        },

        // fraction (f32 only)
        frac(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Frac, dest, src);
            return dest;
        },

        floorf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Floor, dest, src);
            return dest;
        },

        sinf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Sin, dest, src);
            return dest;
        },

        cosf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Cos, dest, src);
            return dest;
        },

        absf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Abs, dest, src);
            return dest;
        },

        sqrtf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Sqrt, dest, src);
            return dest;
        },

        minf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Min, dest, left, right);
            return dest;
        },

        maxf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Max, dest, left, right);
            return dest;
        },


        lengthf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            intrinsics.dotf(dest, src, src);
            intrinsics.sqrtf(dest, dest);
            return dest;
        },

        normalizef(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            const len = alloca(sizeof.f32());
            intrinsics.lengthf(len, src);
            intrinsics.divf(dest, src, len);
            return dest;
        },

        lerpf(dest: PromisedAddress, from: PromisedAddress, to: PromisedAddress, k: PromisedAddress): PromisedAddress {
            assert(from.size === to.size);

            const size = from.size;
            const n = size / sizeof.f32();
            const swizzle = Array(n).fill(0);

            let one = iload(constants.f32(1.0));
            // todo: fix bu with vectored koef.
            let kInv: PromisedAddress;
            if (k.size === sizeof.f32()) {
                kInv = intrinsics.subf(one, one, k);
                kInv.override({ size, swizzle });
            } else {
                k = k.override({ size, swizzle });
                one = one.override({ size, swizzle });
                kInv = intrinsics.subf(one, one, k);
            }

            let temp = alloca(size);

            intrinsics.mulf(temp, to, k);
            intrinsics.mulf(dest, from, kInv);
            intrinsics.addf(dest, dest, temp);

            return dest;
        }
    }


    function resolveMemoryLocation(decl: IVariableDeclInstruction): EMemoryLocation {
        if (decl.isParameter()) {
            if (decl.type.hasUsage('out') || decl.type.hasUsage('inout')) {
                // entry point function can refer to input memory, for ex. vertex shader
                return isEntryPoint() ? EMemoryLocation.k_Input : EMemoryLocation.k_Registers;
            }
        }

        if (decl.isGlobal()) {
            if (decl.isUniform()) {
                return EMemoryLocation.k_Constants;
            }
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

    const checkPostfixNameForSwizzling = (postfixName: string) =>
        postfixName
            .split('')
            .map(c => POSTFIX_COMPONENT_MAP[c])
            .map(i => i >= 0 && i < 4)
            .reduce((accum, val) => accum && val);

    // xxwy => [0, 0, 3, 1]
    const swizzlePatternFromName = (postfixName: string) =>
        postfixName.split('').map(c => POSTFIX_COMPONENT_MAP[c]);


    function iintrinsic(call: IFunctionCallInstruction): PromisedAddress {
        const fdecl = call.decl as IFunctionDeclInstruction;
        const fdef = fdecl.def;
        const retType = fdef.returnType;

        const dest = alloca(retType.size);
        const args = preloadArguments(fdef);
        // TODO: add support for INT type

        function preloadArguments(fdef: IFunctionDefInstruction): PromisedAddress[] {
            const args: PromisedAddress[] = [];
            for (let i = 0; i < fdef.params.length; ++i) {
                const arg = call.args[i];
                let argAddr = raddr(arg);
                if (argAddr.location !== EMemoryLocation.k_Registers) {
                    argAddr = iload(argAddr);
                }
                args.push(argAddr);
            }
            return args;
        }

        switch (fdecl.name) {
            case 'mul':
                assert(fdef.params.length === 2);
                return intrinsics.mulf(dest, args[0], args[1]);
            case 'dot':
                assert(fdef.params.length === 2 && dest.size === sizeof.f32());
                return intrinsics.dotf(dest, args[0], args[1]);
            case 'frac':
                assert(fdef.params.length === 1);
                return intrinsics.frac(dest, args[0]);
            case 'sin':
                assert(fdef.params.length === 1);
                return intrinsics.sinf(dest, args[0]);
            case 'cos':
                assert(fdef.params.length === 1);
                return intrinsics.cosf(dest, args[0]);
            case 'abs':
                assert(fdef.params.length === 1);
                return intrinsics.absf(dest, args[0]);
            case 'sqrt':
                assert(fdef.params.length === 1);
                return intrinsics.sqrtf(dest, args[0]);
            case 'normalize':
                assert(fdef.params.length === 1);
                return intrinsics.normalizef(dest, args[0]);
            case 'length':
                assert(fdef.params.length === 1);
                return intrinsics.lengthf(dest, args[0]);
            case 'floor':
                assert(fdef.params.length === 1);
                return intrinsics.floorf(dest, args[0]);
            case 'min':
                assert(fdef.params.length === 2);
                return intrinsics.minf(dest, args[0], args[1]);
            case 'max':
                assert(fdef.params.length === 2);
                return intrinsics.maxf(dest, args[0], args[1]);
            case 'lerp':
                assert(fdef.params.length === 3);
                return intrinsics.lerpf(dest, args[0], args[1], args[2]);
        }

        assert(false, `unsupported intrinsic found '${fdecl.name}'`);
        return PromisedAddress.INVALID;
    }


    /** resolve address => returns address of temprary result of expression */
    function raddr(expr: IExprInstruction): PromisedAddress {
        switch (expr.instructionType) {
            case EInstructionTypes.k_InitExpr:
                {
                    const init = expr as IInitExprInstruction;

                    if (init.isArray()) {
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                    }

                    let arg = init.args[0];
                    return raddr(arg);
                }
                break;
            case EInstructionTypes.k_BoolExpr:
                {
                    const i32 = (expr as ILiteralInstruction<boolean>).value ? 1 : 0;
                    return constants.i32(i32);
                }
                break;
            case EInstructionTypes.k_IntExpr:
                {
                    const i32 = (expr as ILiteralInstruction<number>).value;
                    return constants.i32(i32);
                }
                break;
            case EInstructionTypes.k_FloatExpr:
                {
                    const f32 = (expr as ILiteralInstruction<number>).value;
                    return constants.f32(f32);
                }
                break;
            case EInstructionTypes.k_IdExpr:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.decl === expression.Unwind(id));

                    const size = id.decl.type.size;
                    const decl = expression.Unwind(id);
                    const location = resolveMemoryLocation(decl);

                    switch (location) {
                        case EMemoryLocation.k_Registers:
                            {
                                return deref(id.decl);
                            }
                        case EMemoryLocation.k_Input:
                            {
                                // implies that each parameter is loaded from its stream, so 
                                // the offset is always zero. 
                                // Otherwise use 'variable.getParameterOffset(decl);'
                                // in order to determ correct offset between parameters
                                const offset = 0;
                                const src = offset;
                                const inputIndex = variable.getParameterIndex(decl);
                                return loc({ inputIndex, addr: src, size, location });
                            }
                        case EMemoryLocation.k_Constants:
                            {
                                return constants.deref(id.decl);
                            }
                    }

                    assert(false, 'unsupported branch found');
                    return PromisedAddress.INVALID;
                }
            case EInstructionTypes.k_ComplexExpr:
                return raddr((expr as IComplexExprInstruction).expr);
            case EInstructionTypes.k_ArithmeticExpr:
                {
                    const arithExpr = expr as IArithmeticExprInstruction;
                    const dest = alloca(arithExpr.type.size);
                    intrinsics.arith(arithExpr.operator, dest, arithExpr.left, arithExpr.right);
                    debug.map(arithExpr);
                    return dest;
                }
                break;
            case EInstructionTypes.k_UnaryExpr:
                {
                    const unary = expr as IUnaryExprInstruction;
                    const op = unary.operator;
                    const dest = alloca(unary.type.size);

                    let src = raddr(unary.expr);
                    if (src.location !== EMemoryLocation.k_Registers) {
                        src = iload(src);
                    }


                    if (SystemScope.isIntBasedType(unary.type)) {
                        switch (op) {
                            case '-':

                                let constant = constants.i32(-1);
                                if (constant.location !== EMemoryLocation.k_Registers) {
                                    constant = iload(constant);
                                }


                                intrinsics.arithi('*', dest, constant, src);
                                debug.map(unary);
                                return dest;
                            // fall to unsupported warning
                        }
                    } else {
                        switch (op) {
                            case '-':

                                let constant = constants.f32(-1.0);
                                if (constant.location !== EMemoryLocation.k_Registers) {
                                    constant = iload(constant);
                                }

                                intrinsics.arithf('*', dest, constant, src);
                                debug.map(unary);
                                return dest;
                            // fall to unsupported warning
                        }
                    }
                    console.error('unsupported type of unary expression found');
                    return PromisedAddress.INVALID;
                }
            case EInstructionTypes.k_RelationalExpr:
                {
                    const relExpr = expr as IRelationalExprInstruction;

                    const opIntMap = {
                        '<': EOperation.k_I32LessThan,
                        '>': EOperation.k_I32GreaterThan,
                        '<=': EOperation.k_I32LessThanEqual,
                        '>=': EOperation.k_I32GreaterThanEqual
                    }

                    const opFloatMap = {
                        '<': EOperation.k_F32LessThan,
                        '>': EOperation.k_F32GreaterThan,
                        '<=': EOperation.k_F32LessThanEqual,
                        '>=': EOperation.k_F32GreaterThanEqual
                    }

                    let op: EOperation;

                    const { left, right } = relExpr;

                    if (left.type.isEqual(T_INT) && right.type.isEqual(T_INT)) {
                        op = opIntMap[relExpr.operator];
                    } else if (left.type.isEqual(T_FLOAT) && right.type.isEqual(T_FLOAT)) {
                        op = opFloatMap[relExpr.operator];
                    } else {
                        // todo: add type description
                        diag.critical(EErrors.k_UnsupportedRelationalExpr, {});
                    }

                    if (!isDef(op)) {
                        diag.critical(EErrors.k_UnsupportedExprType, {});
                        return PromisedAddress.INVALID;
                    }

                    let leftAddr = raddr(left);
                    if (leftAddr.location !== EMemoryLocation.k_Registers) {
                        leftAddr = iload(leftAddr);
                        debug.map(left);
                    }

                    let rightAddr = raddr(right);
                    if (rightAddr.location !== EMemoryLocation.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(right);
                    }

                    const size = relExpr.type.size;
                    const dest = alloca(size);
                    icode(op, dest, leftAddr, rightAddr);
                    debug.map(relExpr);

                    return loc({ addr: dest, size });
                }
                break;
            case EInstructionTypes.k_CastExpr:
                {
                    const castExpr = expr as ICastExprInstruction;

                    if (castExpr.isUseless()) {
                        console.warn(`Useless cast found: ${castExpr.toCode()}`);
                        return raddr(castExpr.expr);
                    }

                    const srcType = castExpr.expr.type;
                    const dstType = castExpr.type;

                    let op: EOperation;
                    // FIXME: add support for dedicated FLOAT => UINT conversion
                    if (srcType.isEqual(T_FLOAT) && (dstType.isEqual(T_INT) || dstType.isEqual(T_UINT))) {
                        op = EOperation.k_F32ToI32;
                    // FIXME: add support for dedicated UINT => FLOAT conversion
                    } else if ((srcType.isEqual(T_INT) || srcType.isEqual(T_UINT)) && dstType.isEqual(T_FLOAT)) {
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
            case EInstructionTypes.k_PostfixPointExpr:
                {
                    const point = expr as IPostfixPointInstruction;
                    const { element, postfix } = point;
                    const elementAddr = raddr(element);

                    let { size, padding } = postfix.type;
                    let swizzle: number[] = null;

                    // Does expression have dynamic indexing?
                    // TODO: rename isConstExpr() method to something more suitable
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
            case EInstructionTypes.k_FunctionCallExpr:
                {
                    const call = expr as IFunctionCallInstruction;
                    const fdecl = call.decl;
                    const fdef = fdecl.def;
                    const retType = fdef.returnType;

                    if (fdecl.instructionType === EInstructionTypes.k_SystemFunctionDecl) {
                        // breakpoint before intrinsic call
                        // TODO: is it's breakpoint really usefull?
                        debug.ns();
                        const dest = iintrinsic(call);
                        debug.map(call);
                        return dest;
                    }

                    const ret = alloca(retType.size);

                    const params = fdef.params;
                    const args = params
                        .map((param, i) => i < call.args.length ? call.args[i] : param.initExpr);
                    const paramSources = args
                        .map(arg => raddr(arg))
                        .map(arg => arg.location === EMemoryLocation.k_Registers ? arg : iload(arg));

                    push(fdecl, ret);

                    for (let i = 0; i < fdef.params.length; ++i) {
                        const src = paramSources[i];

                        // by default all parameters are interpreted as 'in'
                        if (params[i].type.hasUsage('out') || params[i].type.hasUsage('inout')) {
                            ref(params[i], src);
                        } else {
                            // todo: handle expressions like "float4 v = 5.0;"
                            const size = params[i].type.size;
                            const dest = alloca(size);

                            imove(dest, src, size);
                            debug.map(args[i]);

                            ref(params[i], dest);
                        }
                    }

                    translateFunction(ctx, fdecl);
                    pop();

                    return ret;
                }
                break;
            case EInstructionTypes.k_ConstructorCallExpr:
                {
                    const ctorCall = expr as IConstructorCallInstruction;
                    // todo: add correct constructor call support for builtin type at the level of analyzer
                    const type = ctorCall.type;
                    const args = (ctorCall.args as IExprInstruction[]);

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
                                    assert(instruction.isExpression(args[0]), EInstructionTypes[args[0].instructionType]);
                                    let src = raddr(args[0]);

                                    if (src.location !== EMemoryLocation.k_Registers) {
                                        src = iload(src);
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
                                        assert(instruction.isExpression(args[i]), EInstructionTypes[args[i].instructionType]);
                                        let src = raddr(args[i]);

                                        if (src.location !== EMemoryLocation.k_Registers) {
                                            src = iload(src);
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
            case EInstructionTypes.k_VariableDecl:
                {
                    let decl = instr as IVariableDeclInstruction;

                    if (isNull(decl.initExpr)) {
                        // There is no initial value, but allocation should be done anyway
                        // in order to assign register for this variable.
                        ref(decl, alloca(decl.type.size));
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

                    let dest = raddr(decl.initExpr);
                    if (dest.location !== EMemoryLocation.k_Registers) {
                        //breakpoint before variable initialization
                        debug.ns();
                        dest = iload(dest);
                        debug.map(decl.initExpr);
                        // breakpoint right after variable initialization
                        debug.ns();
                    }

                    ref(decl, dest);
                    return;
                }
            case EInstructionTypes.k_DeclStmt:
                {
                    let stmt = instr as DeclStmtInstruction;
                    for (let decl of stmt.declList) {
                        translate(decl);
                    }
                    return;
                }
            case EInstructionTypes.k_ReturnStmt:
                {
                    let retStmt = instr as ReturnStmtInstruction;
                    const expr = retStmt.expr;
                    if (!isNull(expr)) {
                        let src = raddr(expr);

                        if (src.location !== EMemoryLocation.k_Registers) {
                            src = iload(src);
                            debug.map(expr);
                        }

                        const dest = ret();

                        assert(src.size === ret().size);
                        imove(dest, src);
                        debug.map(expr);
                        // breakpoint before leaving function
                        debug.ns();

                        icode(EOperation.k_Ret);
                        debug.map(retStmt);
                    }
                    return;
                }
            case EInstructionTypes.k_StmtBlock:
                {
                    let block = instr as IStmtBlockInstruction;
                    for (let stmt of block.stmtList) {
                        translate(stmt);
                    }
                    return;
                }
            case EInstructionTypes.k_FunctionDecl:
                {
                    let func = instr as IFunctionDeclInstruction;

                    // resolve function's implementation
                    func = func.scope.findFunctionInScope(func);

                    let def = func.def; // todo: handle all arguments!!
                    let impl = func.impl;


                    translate(impl);

                    return;
                }
            case EInstructionTypes.k_ExprStmt:
                {
                    let stmt = instr as IExprStmtInstruction;
                    translate(stmt.expr);
                    return;
                }
            case EInstructionTypes.k_AssignmentExpr:
                {
                    const assigment = instr as IAssignmentExprInstruction;
                    const size = assigment.type.size;
                    assert(size % sizeof.i32() === 0);
                    assert(assigment.operator === '=');

                    // left address can be both from the registers and in the external memory
                    const leftAddr = raddr(assigment.left);

                    assert(instruction.isExpression(assigment.right), EInstructionTypes[assigment.right.instructionType]);
                    // right address always from the registers
                    let rightAddr = raddr(<IExprInstruction>assigment.right);
                    if (rightAddr.location !== EMemoryLocation.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(assigment.right);
                    }

                    imove(leftAddr, rightAddr, size);
                    debug.map(assigment);
                    // breakpoint right after assingment
                    debug.ns();
                    return;
                }
            case EInstructionTypes.k_FunctionCallExpr:
                {
                    // TODO: check function side effects and dont resolve in case of pure function.
                    raddr(instr as IFunctionCallInstruction);
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


export function translate(entryFunc: IFunctionDeclInstruction): ISubProgram {
    let ctx = ContextBuilder();
    let res: ISubProgram = null;

    try {
        if (!isDefAndNotNull(entryFunc)) {
            console.error(`Entry point '${entryFunc.name}' not found.`);
            return null;
        }
        res = translateSubProgram(ctx, entryFunc);
    } catch (e) {
        throw e;
        console.error(TranslatorDiagnostics.stringify(ctx.diag.resolve()));
    }

    return res;
}