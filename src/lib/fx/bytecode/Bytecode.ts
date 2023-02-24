import { assert, isDef, isDefAndNotNull, isNull } from "@lib/common";
import { expression, instruction, types, variable } from "@lib/fx/analisys/helpers";
import { DeclStmtInstruction } from "@lib/fx/analisys/instructions/DeclStmtInstruction";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import { EVariableUsageFlags } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { T_BOOL, T_FLOAT, T_INT, T_UINT } from "@lib/fx/analisys/SystemScope";
import { createFXSLDocument } from "@lib/fx/FXSLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import { EAddrType, EChunkType } from "@lib/idl/bytecode";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import {
    EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, ICastExprInstruction, IComplexExprInstruction,
    IConditionalExprInstruction, IConstructorCallInstruction, IExprInstruction, IExprStmtInstruction, IForStmtInstruction,
    IFunctionCallInstruction, IFunctionDeclInstruction, IIdExprInstruction, IIfStmtInstruction, IInitExprInstruction,
    IInstruction, ILiteralInstruction, ILogicalExprInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction,
    IPostfixPointInstruction, IRelationalExprInstruction, IStmtBlockInstruction, IUnaryExprInstruction, IVariableDeclInstruction
} from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { DiagnosticException, Diagnostics } from "@lib/util/Diagnostics";

import { TypeFieldT, TypeLayoutT } from "@lib/idl/bundles/FxBundle_generated";
import { IDiagnosticReport } from "@lib/idl/IDiagnostics";
import { IFile } from "@lib/idl/parser/IParser";
import { i32ToU8Array } from "./common";
import { ContextBuilder, EErrors, IContext } from "./Context";
import { CDL } from "./DebugLayout";
import PromisedAddress from "./PromisedAddress";
import sizeof from "./sizeof";

// [00 - 01) cbs
// [01 - 17) inputs
// [17 - 33) uavs
// [33 - 64) srvs

export const CBUFFER0_REGISTER = 0;
export const INPUT0_REGISTER = 1;
export const UAV0_REGISTER = 17;
export const SRV0_REGISTER = 33;

export const SRV_TOTAL = 64 - SRV0_REGISTER;
export const UAV_TOTAL = SRV0_REGISTER - UAV0_REGISTER;
export const INPUT_TOTAL = UAV_TOTAL - INPUT0_REGISTER;
export const CBUFFER_TOTAL = INPUT0_REGISTER - CBUFFER0_REGISTER;


const UNRESOLVED_JUMP_LOCATION = -1;

interface ISubProgram {
    code: Uint8Array;
    cdl: CDL;
}

export interface IBCDocument {
    uri: IFile
    diagnosticReport: IDiagnosticReport;
    program: ISubProgram;
}

function writeString(u8data: Uint8Array, offset: number, value: string): number {
    u8data.set(i32ToU8Array(value.length), offset);
    offset += 4;

    u8data.set(value.split('').map(c => c.charCodeAt(0)), offset);
    offset += value.length;
    return offset;
}

function writeInt(u8data: Uint8Array, offset: number, value: number): number {
    u8data.set(i32ToU8Array(value), offset);
    offset += 4;
    return offset;
}

function writeTypeField(u8data: Uint8Array, offset: number, field: TypeFieldT): number {
    offset = writeInt(u8data, offset, field.padding);
    offset = writeInt(u8data, offset, field.size);
    offset = writeString(u8data, offset, <string>field.semantic);
    offset = writeString(u8data, offset, <string>field.name);
    offset = writeTypeLayout(u8data, offset, field.type);
    return offset;
}

function writeTypeLayout(u8data: Uint8Array, offset: number, layout: TypeLayoutT): number {
    offset = writeInt(u8data, offset, layout.size);
    offset = writeInt(u8data, offset, layout.length);
    offset = writeString(u8data, offset, <string>layout.name);
    offset = writeInt(u8data, offset, layout.fields.length);
    for (let field of layout.fields) {
        offset = writeTypeField(u8data, offset, field);
    }
    return offset;
}

function externsChunk(ctx: IContext): ArrayBuffer {
    const { externs } = ctx;
    const reflection = externs.dump();
    
    const sizeofTypeField = (field: TypeFieldT) => {
        return 0 +
            4 /* padding */ +
            4 /* size */ +
            4 /* semantic */ + field.semantic.length +
            4 /* name */ + field.name.length +
            sizeofTypeLayout(field.type);
    }

    const sizeofTypeLayout = (layout: TypeLayoutT) => {
        return 0 +
            4 /* size */ +
            4 /* length */ +
            4 /* sizeof(name) */ + layout.name.length +
            4 /* fields.length */ + layout.fields.reduce((a, tl) => a + sizeofTypeField(tl), 0);
    };


    const byteLength = 
        4/* reflection.length */ +
        reflection.reduce(
            (s, { name, ret, params }) => s + 
            4 /* id */+ 
            4 /* sizeof(name) */ + name.length +
            sizeofTypeLayout(ret) +
            4 /* params.length */ + params.reduce((s, p) => s + sizeofTypeLayout(p), 0), 0);

    const size = (byteLength + 4) >> 2;
    const chunkHeader = [EChunkType.k_Externs, size];
    const data = new Uint32Array(chunkHeader.length + size);
    data.set(chunkHeader);

    const u8data = new Uint8Array(data.buffer, 8/* int header type + int size */);
    let written = writeInt(u8data, 0, reflection.length);
    for (let i = 0; i < reflection.length; ++i) {
        const { id, name, ret, params } = reflection[i];
        written = writeInt(u8data, written, id);
        written = writeString(u8data, written, name);
        written = writeTypeLayout(u8data, written, ret);
        written = writeInt(u8data, written, params.length);
        for (let p of params) {
            written = writeTypeLayout(u8data, written, p);
        }
    }
    return data.buffer;
}

// TODO: rewrite with cleaner code
function constLayoutChunk(ctx: IContext): ArrayBuffer {
    const { constants } = ctx;
    const reflection = constants.dump();
    const byteLength =
        4/* names.length */ +
        reflection.map(entry =>
            entry.name.length +
            entry.type.length +
            entry.semantic.length +
            4 + /* sizeof(name.length) */
            4 + /* sizeof(type.length) */
            4 + /* sizeof(semantic.length) */
            4 + /* sizeof(addr) */
            4 + /* sizeof(size) */
            4   /* sizeof(type.length) */
        ).reduce((prev, curr) => prev + curr, 0);

    const size = (byteLength + 4) >> 2;
    const chunkHeader = [EChunkType.k_Layout, size];
    const data = new Uint32Array(chunkHeader.length + size);
    data.set(chunkHeader);

    const u8data = new Uint8Array(data.buffer, 8/* int header type + int size */);
    let written = writeInt(u8data, 0, reflection.length);
    for (let i = 0; i < reflection.length; ++i) {
        const { name, offset, type, size, semantic } = reflection[i];
        written = writeString(u8data, written, name);
        written = writeString(u8data, written, type);
        written = writeString(u8data, written, semantic || '');
        written = writeInt(u8data, written, offset);
        written = writeInt(u8data, written, size);
    }
    // console.log('after write', u8data.length, 'bytes', written);
    return data.buffer;
}

function constChunk(ctx: IContext): ArrayBuffer {
    const { constants } = ctx;
    const mem = constants.data;
    const size = mem.byteLength >> 2;
    const chunkHeader = [EChunkType.k_Constants, size];
    assert((size << 2) == mem.byteLength);
    const data = new Uint32Array(chunkHeader.length + size);
    data.set(chunkHeader);
    data.set(new Uint32Array(mem.byteArray.buffer, 0, mem.byteLength >> 2), chunkHeader.length);
    return data.buffer;
}


function codeChunk(ctx: IContext): ArrayBuffer {
    const { instructions } = ctx;
    const chunkHeader = [EChunkType.k_Code, instructions.length];
    const data = new Uint32Array(chunkHeader.length + instructions.length);
    data.set(chunkHeader);
    data.set(instructions.data, chunkHeader.length);
    return data.buffer;
}

function binary(ctx: IContext): Uint8Array {
    const chunks = [constLayoutChunk(ctx), constChunk(ctx), codeChunk(ctx), externsChunk(ctx)].map(ch => new Uint8Array(ch));
    const byteLength = chunks.map(x => x.byteLength).reduce((a, b) => a + b);
    let data = new Uint8Array(byteLength);
    let offset = 0;
    chunks.forEach(ch => {
        data.set(ch, offset);
        offset += ch.byteLength;
    });
    return data;
}


function translateProgram(ctx: IContext, fn: IFunctionDeclInstruction): ISubProgram {
    const { constants, debug, alloca, push, pop, addr, imove, ref, icode, instructions } = ctx;

    // NOTE: it does nothing at the momemt :/
    debug.beginCompilationUnit('[todo]', fn.def.returnType);
    // simulate function call()
    const fdef = fn.def;
    let ret = alloca(fdef.returnType.size);
    push(fn, ret);

    // TODO: use the same code as FunctionCall;
    // loading of all non-inpt parameters to registers
    for (let i = 0; i < fdef.params.length; ++i) {
        const param = fdef.params[i];
        if (param.type.usages.includes('out') || param.type.usages.includes('inout')) {
            continue;
        }

        const inputIndex = variable.parameterIndex(param) + INPUT0_REGISTER;
        const size = param.type.size;
        const src = addr.loc({ type: EAddrType.k_Input, inputIndex, addr: 0, size });
        const dest = alloca(size);
        imove(dest, src);
        debug.map(fdef); // FIXME: is it ok?
        ref(param, dest);
    }

    translateUnknown(ctx, fn);
    pop();

    // always push ret as last instruction
    const [op,] = instructions.back();
    if (op != EOperation.k_Ret)
        icode(EOperation.k_Ret);

    debug.endCompilationUnit();

    let code = binary(ctx);         // TODO: stay only binary view
    let cdl = debug.dump();         // code debug layout;

    return {
        code,           // final binary pack
        cdl             // same as PDB
    };
}

function translateUnknown(ctx: IContext, instr: IInstruction): void {
    const {
        pc,
        error,
        critical,
        constants,
        externs,
        uavs,
        srvs,
        alloca,
        addr,
        debug,
        push,
        pop,
        open,
        close,
        deref,
        ref,
        icode,
        imove,
        iop4,
        iop3,
        iop2,
        iop1,
        iload,
        iconst_i32,
        iconst_f32,
        ret,
        depth,
        instructions
    } = ctx;


    // NOTE: pc - number of written instructions
    // NOTE: rc - number of occupied registers

    const isEntryPoint = () => depth() === 1;

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
                    left = addr.override(left, Array(n).fill(0));
                } else if (right.size === sizeof.f32()) {
                    right = addr.override(right, Array(n).fill(0));
                } else {
                    assert(false, 'vectors with differen length cannot be multipled');
                    return PromisedAddress.INVALID;
                }
            }

            const opFloatMap = {
                '+': EOperation.k_F32Add,
                '-': EOperation.k_F32Sub,
                '*': EOperation.k_F32Mul,
                '/': EOperation.k_F32Div,
                '%': EOperation.k_F32Mod
            };

            const op: EOperation = opFloatMap[opName];

            if (!isDef(op)) {
                // todo: emit correct source location
                error(null, EErrors.k_UnsupportedArithmeticExpr, { tooltip: `operation: ${opName}` });
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
                    left = addr.override(left, Array(n).fill(0));
                } else if (right.size === sizeof.f32()) {
                    right = addr.override(right, Array(n).fill(0));
                } else {
                    assert(false, 'vectors with differen length cannot be multipled');
                    return PromisedAddress.INVALID;
                }
            }

            const opIntMap = {
                '+': EOperation.k_I32Add,
                '-': EOperation.k_I32Sub,
                '*': EOperation.k_I32Mul,
                '/': EOperation.k_I32Div,
                '%': EOperation.k_I32Mod
            }

            const op: EOperation = opIntMap[opName];

            if (!isDef(op)) {
                // todo: emit correct source location
                error(null, EErrors.k_UnsupportedArithmeticExpr, { tooltip: `operation ${opName}` });
                return PromisedAddress.INVALID;
            }

            iop3(op, dest, left, right);
            return dest;
        },

        mulf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('*', dest, left, right),
        divf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('/', dest, left, right),
        addf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('+', dest, left, right),
        subf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('-', dest, left, right),
        modf: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithf('%', dest, left, right),

        muli: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithi('*', dest, left, right),
        divi: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithi('/', dest, left, right),
        addi: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithi('+', dest, left, right),
        subi: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithi('-', dest, left, right),
        modi: (dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) => intrinsics.arithi('%', dest, left, right),

        dotf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            let temp = alloca(Math.max(left.size, right.size));
            let mlr = intrinsics.mulf(temp, left, right);
            let n = mlr.size / sizeof.f32();

            // copy first element of 'mlr' to dest
            imove(dest, addr.shrink(mlr, sizeof.f32()));
            for (let i = 1; i < n; ++i) {
                let padding = i * sizeof.f32();
                let size = sizeof.f32();
                intrinsics.addf(dest, dest, addr.sub(mlr, padding, size));
            }

            return dest;
        },

        distancef(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            let temp = alloca(left.size);
            intrinsics.subf(temp, left, right);
            intrinsics.lengthf(dest, temp);
            return dest;
        },

        /** dest = a + b * c */
        madi(dest: PromisedAddress, a: PromisedAddress, b: PromisedAddress, c: PromisedAddress): PromisedAddress {
            iop4(EOperation.k_I32Mad, dest, a, b, c);
            return dest;
        },

        noti(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_I32Not, dest, src);
            return dest;
        },

        mini(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_I32Min, dest, left, right);
            return dest;
        },

        maxi(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_I32Max, dest, left, right);
            return dest;
        },

        fracf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Frac, dest, src);
            return dest;
        },

        floorf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Floor, dest, src);
            return dest;
        },

        ceilf(dest: PromisedAddress, src: PromisedAddress): PromisedAddress {
            iop2(EOperation.k_F32Ceil, dest, src);
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

        powf(dest: PromisedAddress, x: PromisedAddress, y: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Pow, dest, x, y);
            return dest;
        },

        minf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Min, dest, left, right);
            return dest;
        },

        // a = max(b, c);
        maxf(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Max, dest, left, right);
            return dest;
        },

        // ret step(y, x)
        // (x >= y) ? 1 : 0
        stepf(dest: PromisedAddress, y: PromisedAddress, x: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32GreaterThanEqual, dest, x, y);
            return dest;
        },

        clampf(dest: PromisedAddress, x: PromisedAddress, min: PromisedAddress, max: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Max, dest, x, min);
            iop3(EOperation.k_F32Min, dest, dest, max);
            return dest;
        },

        saturatef(dest: PromisedAddress, x: PromisedAddress): PromisedAddress {
            iop3(EOperation.k_F32Max, dest, x, iconst_f32(0.0));
            iop3(EOperation.k_F32Min, dest, dest, iconst_f32(1.0));
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

            let one = iconst_f32(1.0);
            // todo: fix bu with vectored koef.
            let kInv: PromisedAddress;
            if (k.size === sizeof.f32()) {
                kInv = intrinsics.subf(one, one, k);
            } else {
                assert(k.size === from.size);
                one = addr.override(one, swizzle);
                kInv = intrinsics.subf(alloca(dest.size), one, k);
            }

            let temp = alloca(size);

            intrinsics.mulf(temp, to, k);
            intrinsics.mulf(dest, from, kInv);
            intrinsics.addf(dest, dest, temp);

            return dest;
        },

        // hlsl supports float3 x float3 only
        cross(dest: PromisedAddress, left: PromisedAddress, right: PromisedAddress) {
            // .x = (m.y * n.z - m.z * n.y)
            // .y = (m.z * n.x - m.x * n.z)
            // .z = (m.x * n.y - m.y * n.x)
            let f32 = sizeof.f32();

            let t1 = alloca(f32);
            let t2 = alloca(f32);
            let temp = alloca(f32 * 3);

            let mx = addr.sub(left, 0 * f32, f32);
            let my = addr.sub(left, 1 * f32, f32);
            let mz = addr.sub(left, 2 * f32, f32);

            let nx = addr.sub(right, 0 * f32, f32);
            let ny = addr.sub(right, 1 * f32, f32);
            let nz = addr.sub(right, 2 * f32, f32);

            let tx = addr.sub(temp, 0 * f32, f32);
            let ty = addr.sub(temp, 1 * f32, f32);
            let tz = addr.sub(temp, 2 * f32, f32);

            intrinsics.mulf(t1, my, nz);
            intrinsics.mulf(t2, mz, ny);
            intrinsics.subf(tx, t1, t2); // .x

            intrinsics.mulf(t1, mz, nx);
            intrinsics.mulf(t2, mx, nz);
            intrinsics.subf(ty, t1, t2); // .y

            intrinsics.mulf(t1, mx, ny);
            intrinsics.mulf(t2, my, nx);
            intrinsics.subf(tz, t1, t2); // .z

            imove(dest, temp);
            return dest;
        }
    }

    // handle global variables like: const float VALUE = 10;
    // as hidden uniform constants
    function canBePlacedInUniforms(decl: IVariableDeclInstruction): boolean {
        // Suitable:
        //  uniform float4x4 viewMatrix;
        //  float4 color = float4(1, 1, 1, 1);
        //  const float scale = 1;
        // Not suitable:
        //  const float;            // <= not uniform and doesn't have proper default value
        //  RTTexture2D dynamicTex; // <= uav
        //  Texture2D albedo;
        const isUniform = decl.type.isUniform();
        const isCbufferField = (decl.usageFlags & EVariableUsageFlags.k_Cbuffer) != 0;
        const isConstant = decl.initExpr && decl.initExpr.isConst();
        return decl.isGlobal() && (isUniform || isCbufferField || isConstant);
    }


    function resolveAddressType(decl: IVariableDeclInstruction): EAddrType {
        if (decl.isParameter()) {
            if (decl.type.usages.includes('out') || decl.type.usages.includes('inout')) {
                // entry point function can refer to input memory, for ex. vertex shader
                return isEntryPoint() ? EAddrType.k_Input : EAddrType.k_Registers;
            }
        }

        if (decl.isGlobal()) {
            // uniforms are placed in input 0/CBV0
            if (canBePlacedInUniforms(decl)) {
                return EAddrType.k_Input;
            }

            if (SystemScope.isUAV(decl.type)) {
                return EAddrType.k_Input;
            }

            if (SystemScope.isBuffer(decl.type)) {
                return EAddrType.k_Input;
            }

            if (SystemScope.isTexture(decl.type)) {
                return EAddrType.k_Input;
            }

            critical(decl.sourceNode, EErrors.k_AddressCannotBeResolved, {
                tooltip: `could not resolve address type for '${decl.toCode()}'`
            });
        }

        assert(decl.isLocal());
        return EAddrType.k_Registers;
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

    // const swizzlePatternFromPadding = (padding: number, size: number) => {
    //     assert(padding % sizeof.i32() === 0);
    //     assert(size % sizeof.i32() === 0);

    //     return [...Array(size / sizeof.i32()).keys()].map(i => i + padding / sizeof.i32());
    // };

    function preloadArguments(call: IFunctionCallInstruction, forceLoad: boolean): PromisedAddress[] {
        const fdecl = call.decl as IFunctionDeclInstruction;
        const fdef = fdecl.def;
        const args: PromisedAddress[] = [];
        for (let i = 0; i < fdef.params.length; ++i) {
            const arg = call.args[i];
            let argAddr = raddr(arg);
            if (argAddr.type !== EAddrType.k_Registers && forceLoad) {
                argAddr = iload(argAddr);
            }
            args.push(argAddr);
        }
        return args;
    }

    function iextern(call: IFunctionCallInstruction): PromisedAddress {
        const fdecl = call.decl as IFunctionDeclInstruction;
        const fdef = fdecl.def;
        // const retType = fdef.returnType;

        // todo: do not preload all the arguemnts?
        // const args = preloadArguments(call, true);

        const dataSize = fdef.returnType.size + fdef.params.reduce((partialSum, param) => partialSum + param.type.size, 0);
        assert(dataSize >= 0 && dataSize <= 256);

        // calling convention layout
        // dest | is needed
        // arguments | if needed
        const ccLayout = alloca(dataSize);

        let ccParamAddr = addr.sub(ccLayout, fdef.returnType.size);
        assert(fdef.params.length == call.args.length);
        for (let i = 0; i < fdef.params.length; ++i) {
            const arg = call.args[i];
            const param = fdef.params[i];
            const type = param.type;

            assert(arg.type.size === param.type.size);
            assert((arg.type.size % 4) == 0);

            const argAddr = raddr(arg);
            imove(addr.sub(ccParamAddr, 0, type.size), argAddr);
            
            if (i !== fdef.params.length - 1) // if to avoid zero sized address scalculation
                ccParamAddr = addr.sub(ccParamAddr, type.size);
        }

        const iExtern = externs.add(fdef);
        icode(EOperation.k_I32ExternCall, iExtern, ccLayout);
        return addr.sub(ccLayout, 0, fdef.returnType.size);
    }

    function iintrinsic(call: IFunctionCallInstruction): PromisedAddress {
        const fdecl = call.decl as IFunctionDeclInstruction;
        const fdef = fdecl.def;
        const retType = fdef.returnType;

        const dest = alloca(retType.size);

        let forceLoadArgumentsToRegisters: boolean;

        switch (fdecl.name) {
            case 'InterlockedAdd':
                // expected InterlockedAdd(UAV pointer [uint/int], any [uint/int], any [uint/int])
                forceLoadArgumentsToRegisters = false;
                break;
            default:
                forceLoadArgumentsToRegisters = true;
        }


        const args = preloadArguments(call, forceLoadArgumentsToRegisters);


        switch (fdecl.name) {
            case 'asuint':
            case 'asfloat':
            case 'asint':
                // NOTE: nothing todo
                return args[0];
            case 'mul':
                return intrinsics.mulf(dest, args[0], args[1]);
            case 'dot':
                return intrinsics.dotf(dest, args[0], args[1]);
            case 'frac':
                return intrinsics.fracf(dest, args[0]);
            case 'sin':
                return intrinsics.sinf(dest, args[0]);
            case 'cos':
                return intrinsics.cosf(dest, args[0]);
            case 'abs':
                return intrinsics.absf(dest, args[0]);
            case 'sqrt':
                return intrinsics.sqrtf(dest, args[0]);
            case 'pow':
                return intrinsics.powf(dest, args[0], args[1]);
            case 'normalize':
                return intrinsics.normalizef(dest, args[0]);
            case 'length':
                return intrinsics.lengthf(dest, args[0]);
            case 'floor':
                return intrinsics.floorf(dest, args[0]);
            case 'ceil':
                return intrinsics.ceilf(dest, args[0]);
            case 'distance':
                return intrinsics.distancef(dest, args[0], args[1]);
            case 'min':
                // TODO: separate INT/FLOAT intrisics
                if (SystemScope.isFloatBasedType(fdef.params[0].type)) {
                    return intrinsics.minf(dest, args[0], args[1]);
                }
                assert(SystemScope.isIntBasedType(fdef.params[0].type) || SystemScope.isUintBasedType(fdef.params[1].type));
                // handle INT/UINT params as int intrinsic
                return intrinsics.mini(dest, args[0], args[1]);
            case 'max':
                // TODO: separate INT/FLOAT intrisics
                if (SystemScope.isFloatBasedType(fdef.params[0].type)) {
                    return intrinsics.maxf(dest, args[0], args[1]);
                }
                assert(SystemScope.isIntBasedType(fdef.params[0].type) || SystemScope.isUintBasedType(fdef.params[0].type));
                // handle INT/UINT params as int intrinsic
                return intrinsics.maxi(dest, args[0], args[1]);
            case 'step':
                assert(SystemScope.isFloatBasedType(fdef.params[0].type));
                return intrinsics.stepf(dest, args[0], args[1]);
            case 'clamp':
                assert(SystemScope.isFloatBasedType(fdef.params[0].type));
                return intrinsics.clampf(dest, args[0], args[1], args[2]);
            case 'saturate':
                assert(SystemScope.isFloatBasedType(fdef.params[0].type));
                return intrinsics.saturatef(dest, args[0]);
            case 'lerp':
                return intrinsics.lerpf(dest, args[0], args[1], args[2]);
            case 'cross':
                return intrinsics.cross(dest, args[0], args[1]);
            case 'mod':
                // TODO: separate INT/FLOAT intrisics
                if (SystemScope.isFloatBasedType(fdef.params[0].type)) {
                    return intrinsics.modf(dest, args[0], args[1]);
                }
                assert(SystemScope.isIntBasedType(fdef.params[0].type) || SystemScope.isUintBasedType(fdef.params[0].type));
                // handle INT/UINT params as int intrinsic
                return intrinsics.modi(dest, args[0], args[1]);

            case 'InterlockedAdd':
                {
                    assert(fdef.params.length === 3);

                    assert(args[0].type === EAddrType.k_PointerInput, 'destination must be UAV address');
                    assert(args[0].size === sizeof.i32(), 'only int/uint values are supported');

                    if (args[1].type !== EAddrType.k_Registers) {
                        args[1] = iload(args[1]);
                    }

                    let originalAddr = args[2];
                    if (args[2].type !== EAddrType.k_Registers) {
                        originalAddr = alloca(sizeof.i32());
                    }

                    imove(originalAddr, args[0]);

                    const changedAddr = intrinsics.addi(alloca(sizeof.i32()), originalAddr, args[1]);
                    imove(args[0], changedAddr);

                    if (args[2] !== originalAddr) {
                        imove(args[2], originalAddr);
                    }

                    return PromisedAddress.INVALID;
                }

            //
            // UAVs
            //

            /** @returns: The post-decremented counter value. */
            case 'DecrementCounter':
                {
                    const uav = call.callee;
                    const uavAddr = raddr(uav);
                    const uavCounterAddr = addr.shrink(uavAddr, sizeof.i32());
                    const valueAddr = iload(uavCounterAddr);
                    const nextValueAddr = intrinsics.addi(alloca(sizeof.i32()), valueAddr, iconst_i32(-1));
                    imove(uavCounterAddr, nextValueAddr);
                    return nextValueAddr;
                }
            /** @returns: The pre-incremented counter value. */
            case 'IncrementCounter':
                {
                    const uav = call.callee;
                    const uavAddr = raddr(uav);
                    const uavCounterAddr = addr.shrink(uavAddr, sizeof.i32());
                    const valueAddr = iload(uavCounterAddr);
                    const nextValueAddr = intrinsics.addi(alloca(sizeof.i32()), valueAddr, iconst_i32(+1));
                    imove(uavCounterAddr, nextValueAddr);
                    return valueAddr;
                }
            case 'Append':
                {
                    const { callee: uav, args } = call;
                    const uavAddr = raddr(uav);
                    const uavCounterAddr = addr.shrink(uavAddr, sizeof.i32());

                    assert(args.length === 1);
                    const srcAddr = raddr(args[0]);
                    const valueAddr = iload(uavCounterAddr);

                    const arrayElementSize = args[0].type.size;

                    const uavDataAddr = addr.sub(uavAddr, sizeof.i32());
                    const elementPointer = addr.subPointer(uavDataAddr, valueAddr, arrayElementSize);

                    imove(elementPointer, srcAddr);

                    // TODO: replace with intrinsics.inc();
                    intrinsics.addi(valueAddr, valueAddr, iconst_i32(1));
                    imove(uavCounterAddr, valueAddr);

                    return elementPointer;
                }

            //
            // Textures
            //

            case 'GetDimensions':
                {
                    const { callee: tex } = call;
                    const texAddr = raddr(tex);

                    // GetDimensions(w, h) only supported
                    assert(tex.type.name.includes('Texture2D'));
                    assert(args.length === 2);

                    const w = addr.sub(texAddr, 0, sizeof.i32());
                    const h = addr.sub(texAddr, sizeof.i32(), sizeof.i32());
                    // NOTE: always returns size of zero mip (!)
                    // const mip = args[0];
                    const wout = args[1];
                    const hout = args[2];

                    imove(wout, w);
                    imove(hout, h);

                    return PromisedAddress.INVALID;
                }

            case 'Load':
                {
                    const { callee } = call;
                    const tex = raddr(callee);

                    // Load(int3) only supported
                    assert(callee.type.name.includes('Texture2D'));
                    assert(args.length === 1);

                    let uvs = args[0];
                    if (uvs.type !== EAddrType.k_Registers) {
                        uvs = iload(uvs);
                    }

                    //const u = addr.sub(uvs, 0, sizeof.i32());
                    // descriptor size if 64 bytes
                    // width  | 4 byte
                    // height | 4 byte
                    // format | 4 byte
                    // unused | 52 bytes

                    //const v = addr.sub(uvs, sizeof.i32(), sizeof.i32());
                    //const w = addr.sub(tex, 0, sizeof.i32());
                    // const h = addr.sub(texAddr, sizeof.i32(), sizeof.i32());

                    // const valueAddr = alloca(sizeof.i32());
                    // intrinsics.madi(valueAddr, u, w, v);

                    // const texelSize = callee.type.arrayElementType.size;
                    const dest = alloca(sizeof.f32() * 4);
                    icode(EOperation.k_I32TextureLoad, dest, tex.inputIndex, uvs);
                    // const elementPointer = addr.subPointer(dest, valueAddr, texelSize);
                    // return elementPointer;
                    return dest;
                }
        }

        error(call.sourceNode, EErrors.k_UnsupportedIntrinsic, { name: call.decl.name });
        return PromisedAddress.INVALID;
    }


    /** resolve address => returns address of temprary result of expression */
    function raddr(expr: IExprInstruction): PromisedAddress {
        switch (expr.instructionType) {
            case EInstructionTypes.k_InitExpr:
                {
                    const init = expr as IInitExprInstruction;

                    if (init.isArray()) {
                        // todo: add support
                        error(expr.sourceNode, EErrors.k_UnsupportedExprType, { tooltip: 'arrays are not yet supported' });
                        return PromisedAddress.INVALID;
                    }

                    let arg = init.args[0];
                    return raddr(arg);
                }
                break;
            case EInstructionTypes.k_BoolExpr:
                {
                    const i32 = (expr as ILiteralInstruction<boolean>).value ? 1 : 0;
                    return iconst_i32(i32);
                }
                break;
            case EInstructionTypes.k_IntExpr:
                {
                    const i32 = (expr as ILiteralInstruction<number>).value;
                    return iconst_i32(i32);
                }
                break;
            case EInstructionTypes.k_FloatExpr:
                {
                    const f32 = (expr as ILiteralInstruction<number>).value;
                    return iconst_f32(f32);
                }
                break;
            case EInstructionTypes.k_StringExpr:
                {
                    // remove quotes
                    const cstr = (expr as ILiteralInstruction<string>).value?.slice(1, -1);
                    assert(cstr.length > 0);
                    // input0, size = 4/* cstr.length */ + sizeof(cstr)
                    const constAddr = constants.derefCString(cstr);
                    return iconst_i32(constAddr.addr); // write to register addr of string in constant buffer 0. 
                }
                break;
            case EInstructionTypes.k_IdExpr:
                {
                    let id = (expr as IIdExprInstruction);
                    assert(id.decl === expression.unwind(id));

                    const size = id.decl.type.size;
                    const decl = expression.unwind(id);
                    const addrType = resolveAddressType(decl);

                    switch (addrType) {
                        case EAddrType.k_Registers:
                            {
                                return deref(id.decl);
                            }
                        case EAddrType.k_Input:
                            {
                                // CBUFFER0_REGISTER input is always being used for hidden constant buffer (uniform constants)
                                if (canBePlacedInUniforms(decl)) {
                                    return constants.deref(decl);
                                }

                                if (SystemScope.isUAV(decl.type)) {
                                    return uavs.deref(decl);
                                }

                                if (SystemScope.isBuffer(decl.type)) {
                                    return srvs.deref(decl);
                                }

                                if (SystemScope.isTexture(decl.type)) {
                                    return srvs.deref(decl);
                                }

                                // implies that each parameter is loaded from its stream, so 
                                // the offset is always zero. 
                                // Otherwise use 'variable.getParameterOffset(decl);'
                                // in order to determ correct offset between parameters
                                const offset = 0;
                                const src = offset;
                                const inputIndex = variable.parameterIndex(decl) + INPUT0_REGISTER;
                                assert(variable.parameterIndex(decl) < INPUT_TOTAL);
                                return addr.loc({ inputIndex, addr: src, size, type: addrType });
                            }
                    }

                    critical(id.sourceNode, EErrors.k_UnsupportedAddressType, { tooltip: `type: ${addrType}` });
                    return PromisedAddress.INVALID;
                }
            case EInstructionTypes.k_ComplexExpr:
                return raddr((expr as IComplexExprInstruction).expr);
            case EInstructionTypes.k_ArithmeticExpr:
                {
                    const arithExpr = expr as IArithmeticExprInstruction;
                    const dest = alloca(arithExpr.type.size);

                    const opName = arithExpr.operator;
                    const left = arithExpr.left;
                    const right = arithExpr.right;

                    assert(SystemScope.isScalarType(left.type) || SystemScope.isVectorType(left.type));
                    assert(SystemScope.isScalarType(right.type) || SystemScope.isVectorType(right.type));

                    let leftAddr = raddr(left);
                    if (leftAddr.type !== EAddrType.k_Registers) {
                        leftAddr = iload(leftAddr);
                        debug.map(left);
                    }

                    let rightAddr = raddr(right);
                    if (rightAddr.type !== EAddrType.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(right);
                    }

                    if (SystemScope.isFloatBasedType(left.type)) {
                        assert(SystemScope.isFloatBasedType(right.type));
                        intrinsics.arithf(opName, dest, leftAddr, rightAddr);
                    } else if (SystemScope.isIntBasedType(left.type) || SystemScope.isUintBasedType(left.type)) {
                        assert(SystemScope.isIntBasedType(right.type) || SystemScope.isUintBasedType(right.type));
                        intrinsics.arithi(opName, dest, leftAddr, rightAddr);
                    } else {
                        assert(false);
                        return PromisedAddress.INVALID;
                    }

                    debug.map(arithExpr);
                    return dest;
                }
                break;
            case EInstructionTypes.k_AssignmentExpr:
                {
                    const assigment = expr as IAssignmentExprInstruction;
                    const size = assigment.type.size;
                    assert(size % sizeof.i32() === 0);


                    // left address can be both from the registers and in the external memory
                    const leftAddr = raddr(assigment.left);

                    assert(instruction.isExpression(assigment.right), EInstructionTypes[assigment.right.instructionType]);
                    // right address always from the registers
                    let rightAddr = raddr(<IExprInstruction>assigment.right);
                    if (rightAddr.type !== EAddrType.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(assigment.right);
                    }

                    const floatBased = SystemScope.isFloatBasedType(expr.type);

                    switch (assigment.operator) {
                        case '=':
                            imove(leftAddr, rightAddr);
                            break;
                        case '+=':
                            floatBased
                                ? intrinsics.addf(leftAddr, leftAddr, rightAddr)
                                : intrinsics.addi(leftAddr, leftAddr, rightAddr);
                            break;
                        case '-=':
                            floatBased
                                ? intrinsics.subf(leftAddr, leftAddr, rightAddr)
                                : intrinsics.subi(leftAddr, leftAddr, rightAddr);
                            break;
                        case '*=':
                            floatBased
                                ? intrinsics.mulf(leftAddr, leftAddr, rightAddr)
                                : intrinsics.muli(leftAddr, leftAddr, rightAddr);
                            break;
                        case '/=':
                            floatBased
                                ? intrinsics.divf(leftAddr, leftAddr, rightAddr)
                                : intrinsics.divi(leftAddr, leftAddr, rightAddr);
                            break;
                        default:
                            error(null, EErrors.k_UnsupportedAssigmentOperator, { tooltip: `operator: ${assigment.operator}` });
                    }

                    debug.map(assigment);
                    // breakpoint right after assingment
                    debug.ns();
                    return leftAddr;
                }
            case EInstructionTypes.k_PostfixArithmeticExpr:
                {
                    const postfix = expr as IPostfixArithmeticInstruction;
                    const operand = postfix.expr;
                    const op = postfix.operator;
                    const size = postfix.type.size;

                    let src = raddr(operand);
                    if (src.type !== EAddrType.k_Registers) {
                        src = iload(src);
                    }

                    if (SystemScope.isIntBasedType(operand.type)) {
                        switch (op) {
                            case '++':
                                {
                                    const dest = imove(alloca(size), src);
                                    intrinsics.arithi('+', src, src, iconst_i32(1));
                                    debug.map(postfix);
                                    return dest;
                                }
                            case '--':
                                {
                                    const dest = imove(alloca(size), src);
                                    intrinsics.arithi('-', src, src, iconst_i32(1));
                                    debug.map(postfix);
                                    return dest;
                                }
                            // fall to unsupported warning
                        }
                    } else {
                        switch (op) {
                            case '++':
                                {
                                    const dest = imove(alloca(size), src);
                                    intrinsics.arithf('+', src, src, iconst_f32(1));
                                    debug.map(postfix);
                                    return dest;
                                }
                            case '--':
                                {
                                    const dest = imove(alloca(size), src);
                                    intrinsics.arithf('-', src, src, iconst_f32(1));
                                    debug.map(postfix);
                                    return dest;
                                }
                            // fall to unsupported warning
                        }
                    }

                    error(postfix.sourceNode, EErrors.k_UnsupportedUnaryExpression, {
                        tooltip: `unsupported type of unary expression found: '${op}'(${postfix.toCode()})`
                    });
                    return PromisedAddress.INVALID;
                }
            case EInstructionTypes.k_UnaryExpr:
                {
                    const unary = expr as IUnaryExprInstruction;
                    const operand = unary.expr;
                    const op = unary.operator;
                    const size = unary.type.size;

                    let src = raddr(operand);
                    if (src.type !== EAddrType.k_Registers) {
                        src = iload(src);
                    }

                    if (SystemScope.isBoolBasedType(operand.type)) {
                        if (op === '!') {
                            const dest = intrinsics.noti(alloca(size), src);
                            debug.map(unary);
                            return dest;
                        }
                    }

                    if (SystemScope.isIntBasedType(operand.type)) {
                        switch (op) {
                            case '-':
                                {
                                    const dest = intrinsics.arithi('*', alloca(size), src, iconst_i32(-1));
                                    debug.map(unary);
                                    return dest;
                                }
                            case '+':
                                // nothing todo
                                return src;
                            case '++':
                                {
                                    const dest = intrinsics.arithi('+', src, src, iconst_i32(1));
                                    debug.map(unary);
                                    return dest;
                                }
                            case '--':
                                {
                                    const dest = intrinsics.arithi('-', src, src, iconst_i32(1));
                                    debug.map(unary);
                                    return dest;
                                }
                            // fall to unsupported warning
                        }
                    } else {
                        switch (op) {
                            case '-':
                                {
                                    const dest = intrinsics.arithf('*', alloca(size), src, iconst_f32(-1.0));
                                    debug.map(unary);
                                    return dest;
                                }
                            case '++':
                                {
                                    const dest = intrinsics.arithf('+', src, src, iconst_f32(1));
                                    debug.map(unary);
                                    return dest;
                                }
                            case '--':
                                {
                                    const dest = intrinsics.arithf('-', src, src, iconst_f32(1));
                                    debug.map(unary);
                                    return dest;
                                }
                            // fall to unsupported warning
                        }
                    }
                    error(unary.sourceNode, EErrors.k_UnsupportedUnaryExpression, {
                        tooltip: `unsupported type of unary expression found: '${op}'(${unary.toCode()})`
                    });
                    return PromisedAddress.INVALID;
                }
            case EInstructionTypes.k_LogicalExpr:
                {
                    const logicExpr = expr as ILogicalExprInstruction;

                    const opMap = {
                        '||': EOperation.k_I32LogicalOr,
                        '&&': EOperation.k_I32LogicalAnd
                    };

                    let op: EOperation = opMap[logicExpr.operator];;

                    const { left, right } = logicExpr;

                    let leftAddr = raddr(left);
                    if (leftAddr.type !== EAddrType.k_Registers) {
                        leftAddr = iload(leftAddr);
                        debug.map(left);
                    }

                    let rightAddr = raddr(right);
                    if (rightAddr.type !== EAddrType.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(right);
                    }

                    const size = logicExpr.type.size;
                    const dest = alloca(size);
                    iop3(op, dest, leftAddr, rightAddr);
                    debug.map(logicExpr);

                    return addr.loc({ addr: dest, size });
                }
            case EInstructionTypes.k_RelationalExpr:
                {
                    const relExpr = expr as IRelationalExprInstruction;

                    const opUintMap = {
                        '<': EOperation.k_U32LessThan,          //lt
                        '>=': EOperation.k_U32GreaterThanEqual, // ge
                        '==': EOperation.k_I32Equal,            // << compare with I32 operator
                        '!=': EOperation.k_I32NotEqual          // << compare with I32 operator
                    }

                    const opIntMap = {
                        '<': EOperation.k_I32LessThan,          //lt
                        '>=': EOperation.k_I32GreaterThanEqual, // ge
                        '==': EOperation.k_I32Equal,            // eq
                        '!=': EOperation.k_I32NotEqual          // ne
                    };

                    const opFloatMap = {
                        '<': EOperation.k_F32LessThan,          // lt
                        '>=': EOperation.k_F32GreaterThanEqual, // ge
                        '==': EOperation.k_I32Equal,            // << compare with I32 operator
                        '!=': EOperation.k_I32NotEqual          // << compare with I32 operator
                    };

                    let op: EOperation;
                    let { left, right } = relExpr;
                    let operator = relExpr.operator;

                    // (left > right) => (right < left)
                    if (operator === '>') {
                        operator = '<';
                        [right, left] = [left, right];
                    }

                    // (left <= right) => (right >= left)
                    if (operator === '<=') {
                        operator = '>=';
                        [right, left] = [left, right];
                    }


                    if (types.equals(left.type, T_INT)) {
                        op = opIntMap[operator];

                        // print warning if right type is UINT;
                        if (!types.equals(right.type, T_INT) && !types.equals(right.type, T_UINT)) {
                            error(expr.sourceNode, EErrors.k_UnsupportedRelationalExpr, {});
                            return PromisedAddress.INVALID;
                        }
                    } else if (types.equals(left.type, T_UINT)) {
                        op = opUintMap[operator];

                        // print warning if right type is INT;
                        if (!types.equals(right.type, T_UINT) && !types.equals(right.type, T_INT)) {
                            error(expr.sourceNode, EErrors.k_UnsupportedRelationalExpr, {});
                            return PromisedAddress.INVALID;
                        }
                    } else if (types.equals(left.type, T_FLOAT)) {
                        op = opFloatMap[operator];

                        if (!types.equals(right.type, T_FLOAT)) {
                            error(expr.sourceNode, EErrors.k_UnsupportedRelationalExpr, {});
                            return PromisedAddress.INVALID;
                        }
                    } else if (types.equals(left.type, T_BOOL)) {
                        op = opIntMap[operator];
                        if (!types.equals(right.type, T_BOOL)) {
                            error(expr.sourceNode, EErrors.k_UnsupportedRelationalExpr, {});
                            return PromisedAddress.INVALID;
                        }
                    }

                    if (!op) {
                        error(expr.sourceNode, EErrors.k_UnsupportedRelationalExpr, {});
                        return PromisedAddress.INVALID;
                    }

                    let leftAddr = raddr(left);
                    if (leftAddr.type !== EAddrType.k_Registers) {
                        leftAddr = iload(leftAddr);
                        debug.map(left);
                    }

                    let rightAddr = raddr(right);
                    if (rightAddr.type !== EAddrType.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(right);
                    }

                    const size = relExpr.type.size;
                    const dest = alloca(size);
                    iop3(op, dest, leftAddr, rightAddr);
                    debug.map(relExpr);

                    return addr.loc({ addr: dest, size });
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

                    // TODO: add support for vectors

                    if (types.equals(dstType, T_BOOL)) {
                        const size = castExpr.type.size;
                        const dest = alloca(size);
                        let exprAddr = raddr(castExpr.expr);
                        if (exprAddr.type !== EAddrType.k_Registers) {
                            exprAddr = iload(exprAddr);
                        }

                        iop3(EOperation.k_I32NotEqual, dest, exprAddr, iconst_i32(0));
                        debug.map(castExpr);
                        return addr.loc({ addr: dest, size });
                    }


                    if (types.equals(srcType, T_FLOAT)) {
                        if (types.equals(dstType, T_INT)) {
                            op = EOperation.k_F32ToI32;
                        } else if (types.equals(dstType, T_UINT)) {
                            op = EOperation.k_F32ToU32;
                        } else {
                            error(castExpr.sourceNode, EErrors.k_UnsupoortedTypeConversion, { info: castExpr.toCode() });
                            return PromisedAddress.INVALID;
                        }
                    } else if (types.equals(srcType, T_INT)) {
                        if (types.equals(dstType, T_FLOAT)) {
                            op = EOperation.k_I32ToF32;
                        } else if (types.equals(dstType, T_UINT)) {
                            // useless conversion
                            return raddr(castExpr.expr);
                        } else {
                            error(castExpr.sourceNode, EErrors.k_UnsupoortedTypeConversion, { info: castExpr.toCode() });
                            return PromisedAddress.INVALID;
                        }
                    } else if (types.equals(srcType, T_UINT)) {
                        if (types.equals(dstType, T_FLOAT)) {
                            op = EOperation.k_U32ToF32;
                        } else if (types.equals(dstType, T_INT)) {
                            // useless conversion
                            return raddr(castExpr.expr);
                        } else {
                            error(castExpr.sourceNode, EErrors.k_UnsupoortedTypeConversion, { info: castExpr.toCode() });
                            return PromisedAddress.INVALID;
                        }
                    }

                    const size = castExpr.type.size;
                    const dest = alloca(size);
                    let exprAddr = raddr(castExpr.expr);
                    if (exprAddr.type !== EAddrType.k_Registers) {
                        exprAddr = iload(exprAddr);
                    }
                    iop2(op, dest, exprAddr);
                    debug.map(castExpr);
                    return addr.loc({ addr: dest, size });
                }
                break;
            case EInstructionTypes.k_PostfixIndexExpr:
                {
                    const postfixIndex = expr as IPostfixIndexInstruction;
                    // element[index]
                    const { element, index } = postfixIndex;

                    assert(types.equals(index.type, T_INT) || types.equals(index.type, T_UINT));
                    assert(!isNull(element.type.arrayElementType));

                    if (/*index.isConstExpr()*/false) {
                        // TODO: implement constexpr branch
                    } else {
                        let elementAddr = raddr(element);
                        // NOTE: element can be not loaded yet
                        //       we don't want to load all the array (all 'element' object)

                        if (SystemScope.isUAV(element.type)) {
                            // some UAVs can have hidden counter at the beginning of the data
                            // in such cases we need to step forward before fetching the data
                            elementAddr = addr.sub(elementAddr, sizeof.i32());
                        }

                        // sizeof(element[i])
                        let arrayElementSize = element.type.arrayElementType.size;
                        assert(arrayElementSize % sizeof.i32() === 0, `all sizes must be multiple of ${sizeof.i32()}`);

                        // index => index of element in the array (element)
                        let indexAddr = raddr(index);
                        // NOTE: index can be unresolved yet

                        const dest = addr.subPointer(elementAddr, indexAddr, arrayElementSize);
                        debug.map(postfixIndex);
                        return dest;
                    }

                    return PromisedAddress.INVALID; // << FIXME
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

                            assert(padding === instruction.UNDEFINE_PADDING, 'padding of swizzled components must be undefined');

                            // If loading not allowed then we are inside the recursive call to calculate the final address
                            // so in this case we just have to return address with padding added to it.
                            return addr.override(elementAddr, swizzle);
                        } else {
                            return addr.sub(elementAddr, padding, size);
                        }
                    }

                    critical(expr.sourceNode, EErrors.k_NotImplemented, {});

                    // todo: add support for move_reg_ptr, move_ptr_ptr, move_ptr_reg
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

                    // todo: use more precise check
                    if (fdecl.attributes.find(({ name }) => name === 'extern')) {
                        debug.ns();
                        const dest = iextern(call);
                        debug.map(call);
                        return dest;
                    }

                    const ret = alloca(retType.size);

                    const params = fdef.params;
                    const args = params
                        .map((param, i) => i < call.args.length ? call.args[i] : param.initExpr);
                    const paramSources = args
                        .map(arg => raddr(arg))
                        .map(arg => arg.type === EAddrType.k_Registers ? arg : iload(arg));

                    push(fdecl, ret);

                    for (let i = 0; i < fdef.params.length; ++i) {
                        const src = paramSources[i];

                        // by default all parameters are interpreted as 'in'
                        if (params[i].type.usages.includes('out') || params[i].type.usages.includes('inout')) {
                            ref(params[i], src);
                        } else {
                            // todo: handle expressions like "float4 v = 5.0;"
                            const size = params[i].type.size;
                            const dest = alloca(size);

                            imove(dest, src);
                            debug.map(args[i]);

                            ref(params[i], dest);
                        }
                    }

                    translateUnknown(ctx, fdecl);
                    pop();

                    return ret;
                }
                break;
            case EInstructionTypes.k_ConditionalExpr:
                {
                    const { condition, left, right } = expr as IConditionalExprInstruction;
                    assert(types.equals(left.type, right.type));

                    let size = left.type.size;
                    let dest = alloca(size);
                    let condAddr = raddr(condition);
                    assert(condAddr.size === sizeof.bool());

                    if (condAddr.type !== EAddrType.k_Registers) {
                        condAddr = iload(condAddr);
                        debug.map(condition);
                    }

                    iop1(EOperation.k_JumpIf, condAddr);

                    let unresolvedJump = pc();
                    icode(EOperation.k_Jump, UNRESOLVED_JUMP_LOCATION);

                    let leftAddr = raddr(left as IExprInstruction);
                    if (leftAddr.type !== EAddrType.k_Registers) {
                        leftAddr = iload(leftAddr);
                        debug.map(left);
                    }
                    imove(dest, leftAddr);
                    debug.map(left);

                    // jump co contrary or out of if
                    let jumpTo = pc() + 1;
                    instructions.replace(unresolvedJump, EOperation.k_Jump, [jumpTo]);

                    unresolvedJump = pc();
                    icode(EOperation.k_Jump, UNRESOLVED_JUMP_LOCATION);

                    let rightAddr = raddr(right as IExprInstruction);
                    if (rightAddr.type !== EAddrType.k_Registers) {
                        rightAddr = iload(rightAddr);
                        debug.map(right);
                    }
                    imove(dest, rightAddr);
                    debug.map(right);

                    // jump to skip contrary
                    jumpTo = pc();
                    instructions.replace(unresolvedJump, EOperation.k_Jump, [jumpTo]);
                    return addr.loc({ addr: dest, size });
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
                        case 'int':
                        case 'int1':
                        case 'int2':
                        case 'int3':
                        case 'int4':
                        case 'uint':
                        case 'uint1':
                        case 'uint2':
                        case 'uint3':
                        case 'uint4':
                        case 'bool':
                        case 'bool2':
                        case 'bool3':
                        case 'bool4':

                            switch (args.length) {
                                case 1:
                                    // TODO: convert float to int if necessary
                                    // handling for the case single same type argument and multiple floats
                                    assert(instruction.isExpression(args[0]), EInstructionTypes[args[0].instructionType]);
                                    let src = raddr(args[0]);

                                    if (src.type !== EAddrType.k_Registers) {
                                        src = iload(src);
                                        debug.map(args[0]);
                                    }

                                    // convert arguments from float to int and back
                                    if (SystemScope.isFloatBasedType(args[0].type) !== SystemScope.isFloatBasedType(type)) {
                                        const op = SystemScope.isFloatBasedType(type) ? EOperation.k_I32ToF32 : EOperation.k_F32ToI32;
                                        // expected:
                                        //  float4(10), float3(10u), float3(true);
                                        //  float2(int2(10, 10)) etc.
                                        assert(args[0].type.size === sizeof.i32() || args[0].type.size === expr.type.size);

                                        // don't change initial location?
                                        let temp = alloca(src.size);
                                        iop2(op, temp, src);
                                        src = temp;
                                    }

                                    const elementSize = SystemScope.isFloatBasedType(type) ? sizeof.f32() : sizeof.i32();

                                    // FIXME: use 'length' property
                                    let length = type.size / elementSize;
                                    let swizzle = null;
                                    if (src.size === elementSize) {
                                        swizzle = [...Array(length).fill(0)];
                                        src = addr.override(src, swizzle);
                                    } else {
                                        swizzle = [...Array(length).keys()];
                                        src = addr.override(src, swizzle);
                                    }


                                    imove(dest, src);
                                    debug.map(ctorCall);
                                    break;
                                default:
                                    let padding = 0;
                                    for (let i = 0; i < args.length; ++i) {
                                        assert(instruction.isExpression(args[i]), EInstructionTypes[args[i].instructionType]);
                                        let src = raddr(args[i]);

                                        if (src.type !== EAddrType.k_Registers) {
                                            src = iload(src);
                                            debug.map(args[i]);
                                        }


                                        // convert arguments from float to int and back
                                        if (SystemScope.isFloatBasedType(args[i].type) !== SystemScope.isFloatBasedType(type)) {
                                            const op = SystemScope.isFloatBasedType(type) ? EOperation.k_I32ToF32 : EOperation.k_F32ToI32;
                                            assert(args[i].type.size === sizeof.i32()); // <= expected float4(10) or float3(10u) or float3(true);

                                            // don't change initial location?
                                            let temp = alloca(src.size);
                                            iop2(op, temp, src);
                                            src = temp;
                                        }

                                        imove(addr.sub(dest, padding, src.size), src);
                                        padding += args[i].type.size;
                                    }
                                    debug.map(ctorCall);
                                    break;

                            }
                            return addr.loc({ addr: dest, size });
                        default:
                    }
                    console.warn(`Unknown constructor found: ${ctorCall.toCode()}`);
                    return PromisedAddress.INVALID;
                }
                break;
            default:
                console.warn(`Unknown expression found: ${expr.instructionName} (${expr.toCode()})`);
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
                    if (dest.type !== EAddrType.k_Registers) {
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
                    stmt.declList.forEach(translate);
                    return;
                }
            case EInstructionTypes.k_IfStmt:
                {
                    // [out of if code]
                    //  jif:
                    // jump: 'jump to end of if'    ---+
                    // ....                            |
                    // ....                            |
                    // ....                            |
                    // [out of if code]             <--+

                    // [out of if code]
                    //  jif:
                    // jump: 'jump to contrary'     ---+
                    // ....                            |
                    // ....                            |
                    // jump:  'jump to skip contraty'  |  ---+
                    // ....                         <--+     |
                    // ....                                  |
                    // [out of if code]                   <--+ 




                    let ifStmt = instr as IIfStmtInstruction;
                    let { cond, conseq, contrary } = ifStmt;

                    let condAddr = raddr(cond);
                    assert(condAddr.size === sizeof.bool());

                    if (condAddr.type !== EAddrType.k_Registers) {
                        condAddr = iload(condAddr);
                    }

                    iop1(EOperation.k_JumpIf, condAddr);

                    let unresolvedJump = pc();
                    icode(EOperation.k_Jump, UNRESOLVED_JUMP_LOCATION);
                    translate(conseq);
                    // jump co contrary or out of if
                    let jumpTo = pc() + (contrary ? 1 : 0);
                    instructions.replace(unresolvedJump, EOperation.k_Jump, [jumpTo]);

                    if (contrary) {
                        unresolvedJump = pc();
                        icode(EOperation.k_Jump, UNRESOLVED_JUMP_LOCATION);
                        translate(contrary);
                        // jump to skip contrary
                        jumpTo = pc();
                        instructions.replace(unresolvedJump, EOperation.k_Jump, [jumpTo]);
                    }

                    return;
                }
            case EInstructionTypes.k_ReturnStmt:
                {
                    let retStmt = instr as ReturnStmtInstruction;
                    const expr = retStmt.expr;
                    if (!isNull(expr)) {
                        let src = raddr(expr);

                        if (src.type !== EAddrType.k_Registers) {
                            src = iload(src);
                            debug.map(expr);
                        }

                        const dest = ret();

                        assert(src.size === ret().size);
                        imove(dest, src);
                        debug.map(expr);
                    }
                    // breakpoint before leaving function
                    debug.ns();
                    icode(EOperation.k_Ret);
                    debug.map(retStmt);
                    return;
                }
            case EInstructionTypes.k_StmtBlock:
                {
                    open(); // open block
                    let block = instr as IStmtBlockInstruction;
                    for (let stmt of block.stmtList) {
                        translate(stmt);
                    }
                    close(); // close block
                    return;
                }
            case EInstructionTypes.k_FunctionDecl:
                {
                    let func = instr as IFunctionDeclInstruction;

                    if (!func.impl) {
                        // resolve function's implementation
                        func = func.scope.findFunctionInScope(func);
                    }
                    
                    let def = func.def; // todo: handle all arguments!!
                    let impl = func.impl;
                    translate(impl);
                    return;
                }
            case EInstructionTypes.k_ExprStmt:
                {
                    let stmt = instr as IExprStmtInstruction;
                    raddr(stmt.expr);
                    return;
                }
            case EInstructionTypes.k_ForStmt:
                {
                    const loop = instr as IForStmtInstruction;
                    const { init, cond, step, body } = loop;

                    open(); // open block

                    // TODO: make the code more readable
                    if (instruction.isExpression(init)) {
                        // translate as expression
                        raddr(init as IExprInstruction);
                    } else {
                        // translate as varaible declaration
                        translate(init as IVariableDeclInstruction);
                    }

                    assert(types.equals(cond.type, T_BOOL));
                    // before cond:
                    let beforeCondPc = pc();
                    let condAddr = raddr(cond);
                    assert(condAddr.size === sizeof.bool());

                    if (condAddr.type !== EAddrType.k_Registers) {
                        condAddr = iload(condAddr);
                    }

                    // TOOD: add support for break statement.

                    iop1(EOperation.k_JumpIf, condAddr);
                    let unresolvedJump = pc();
                    icode(EOperation.k_Jump, UNRESOLVED_JUMP_LOCATION);

                    translate(body);

                    // step:
                    raddr(step);
                    // goto to before condition
                    icode(EOperation.k_Jump, beforeCondPc);

                    // out of loop:
                    let outofLoopPc = pc();
                    // resolve jump in case of invalid condition => go to out of loop
                    instructions.replace(unresolvedJump, EOperation.k_Jump, [outofLoopPc]);

                    close(); // close block

                    return;
                }
            default:
                console.warn(`Unknown statement found: ${instr.instructionName} (${instr.toCode()})`);
        }
    }

    translate(instr);
}


const hex2 = (v: number) => `0x${v.toString(16).padStart(2, '0')}`;
const hex4 = (v: number) => `0x${v.toString(16).padStart(4, '0')}`;
// const reg = (v: number) => REG_NAMES[v] || `[${hex2(v >>> 0)}]`;    // register address;
// const addr = (v: number) => `%${hex4(v >>> 0)}%`;                   // global memory address;

/// <reference path="./webpack.d.ts" />
export function translate(fn: IFunctionDeclInstruction): IBCDocument;
export function translate(slDocument: ISLDocument, entryName: string): IBCDocument;
export function translate(a, b?): IBCDocument {
    let uri: IFile;
    let entryFunc: IFunctionDeclInstruction;

    switch(arguments.length) {
        case 2:
            {
                let [ slDocument, entryName ] = arguments;
                entryFunc = slDocument.root.scope.findFunction(entryName, null);
                uri = slDocument.uri;
            }
            break;
        case 1:
            {
                [ entryFunc ] = arguments;
                assert(entryFunc);
                uri = entryFunc.sourceNode?.loc?.start.file;
            }
            break;
        default:
            assert(false);
    }

    const ctx = ContextBuilder(uri);
    let program: ISubProgram = null;
    if (!PRODUCTION) {
        console.time('[translate program]');
    }
    try {
        if (!isDefAndNotNull(entryFunc)) {
            ctx.critical(entryFunc.sourceNode, EErrors.k_EntryPointNotFound, {});
        }
        program = translateProgram(ctx, entryFunc);
    } catch (e) {
        if (!(e instanceof DiagnosticException)) {
            throw e;
        }
    }
    if (!PRODUCTION) {
        console.timeEnd('[translate program]');
        // console.log(`${entryFunc.def.name} translated as ${res.code.byteLength} bytes`);
    }
    const diagnosticReport = ctx.diag.resolve();
    return { uri, diagnosticReport, program };
}

export async function translateExpression(expr: string, context?: ISLDocument): Promise<IBCDocument> {
    const uri = `://expression`;
    const anonymousFuncName = `anonymous`;
    const source = `auto ${anonymousFuncName}() { return (${expr}); }`;
    const textDocument = await createTextDocument(uri, source);
    const documentEx = await createFXSLDocument(textDocument, undefined, context);
    if (!documentEx.diagnosticReport.errors) {
        return translate(documentEx, anonymousFuncName);
    }
    console.error(Diagnostics.stringify(documentEx.diagnosticReport));
    return null;
}

