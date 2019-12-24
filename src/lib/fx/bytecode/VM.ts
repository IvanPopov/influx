import { assert, isDefAndNotNull, isString, isNull } from "@lib/common";
import { EChunkType, EOperation } from "@lib/idl/bytecode";
import { IMap } from "@lib/idl/IMap";
import * as Bytecode from '@lib/fx/bytecode';

import { i32ToU8Array, u8ArrayToI32, u8ArrayAsI32, u8ArrayAsF32 } from "./common";
import { IScope, ITypeInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";

// // import { remote } from 'electron';
// import * as isElectron from 'is-electron-renderer';

type Chunk = Uint8Array;
type ChunkMap = IMap<Chunk>;

export function decodeChunks(code: Uint8Array, chunks?: ChunkMap): ChunkMap {
    if (!isDefAndNotNull(chunks)) {
        chunks = {};
    }

    let view = new DataView(code.buffer, code.byteOffset, code.byteLength);
    let type = view.getUint32(0, true);
    let byteLength = view.getUint32(4, true) << 2;
    let content = new Uint8Array(code.buffer, code.byteOffset + 8, byteLength);

    chunks[type] = content;

    let nextChunkOffset = content.byteOffset + content.byteLength;
    if (nextChunkOffset < code.buffer.byteLength) {
        decodeChunks(new Uint8Array(content.buffer, nextChunkOffset), chunks);
    }

    return chunks;
}


export function decodeCodeChunk(codeChunk: Uint8Array): Uint32Array {
    return new Uint32Array(codeChunk.buffer, codeChunk.byteOffset, codeChunk.byteLength >> 2);
}

export function decodeConstChunk(constChunk: Uint8Array): Uint8Array {
    // return new Uint8Array(constChunk.buffer, constChunk.byteOffset, constChunk.byteLength >> 2);
    return constChunk;
}


// TODO: rewrite with cleaner code
export function decodeLayoutChunk(layoutChunk: Uint8Array): IMap<number> {
    // console.log('before read', layoutChunk.length, 'bytes');
    let offset = 0;
    let count = u8ArrayToI32(layoutChunk.subarray(offset, offset + 4));
    offset += 4;

    let layout = {};
    for (let i = 0; i < count; ++i) {
        const nameLength = u8ArrayToI32(layoutChunk.subarray(offset, offset + 4));
        offset += 4;
        const name = String.fromCharCode(...layoutChunk.subarray(offset, offset + nameLength));
        offset += nameLength;
        const addr = u8ArrayToI32(layoutChunk.subarray(offset, offset + 4));
        offset += 4;
        layout[name] = addr;
    }
    return layout;
}

export type INT32 = number;

class VM {
    static $regs = new ArrayBuffer(512 * 4);
    static iregs = new Int32Array(VM.$regs);
    static fregs = new Float32Array(VM.$regs);
    static regs = new Uint8Array(VM.$regs);

    static play(data: Bundle): Uint8Array {
        let i4 = 0;                      // current instruction;
        let ilist = data.instructions;

        let iregs = VM.iregs;
        let fregs = VM.fregs;

        let $cb = data.constants;
        let icb = new Int32Array($cb.buffer, $cb.byteOffset);
        // let fcb = new Float32Array($cb.buffer, $cb.byteOffset);

        // TODO: handle correctly empty input
        // TODO: don't allocate inputs here
        let $input = data.input || [];
        for (let i = 0; i < 3; ++i) {
            $input[i] = $input[i] || new Uint8Array(0);
        }
        let iinput = $input.map(u8 => new Int32Array(u8.buffer, u8.byteOffset));


        end:
        while (i4 < ilist.length) {
            let op = ilist[i4];
            let a = ilist[i4 + 1];
            let b = ilist[i4 + 2];
            let c = ilist[i4 + 3];
            let d = ilist[i4 + 4];

            // TODO: use already aligned adresses
            let a4 = a >> 2;
            let b4 = b >> 2;
            let c4 = c >> 2;
            let d4 = d >> 2;

            switch (op) {
                case EOperation.k_I32LoadConst:
                    iregs[a4] = icb[b4];
                    break;
                case EOperation.k_I32LoadInput:
                    iregs[b4] = iinput[a][c4];
                    break;
                case EOperation.k_I32LoadRegister:
                    iregs[a4] = iregs[b4];
                    break;
                case EOperation.k_I32StoreInput:
                    iinput[a][b4] = iregs[c4];
                    break;

                case EOperation.k_I32LoadRegistersPointer:
                    iregs[a4] = iregs[iregs[b4] >> 2];
                    break;
                case EOperation.k_I32LoadInputPointer:
                    iregs[b4] = iinput[a][iregs[c4] >> 2];
                    break;
                case EOperation.k_I32LoadConstPointer:
                    iregs[a4] = icb[iregs[b4] >> 2];
                    break;

                //
                // Arithmetic operations
                //

                case EOperation.k_I32Add:
                    iregs[a4] = iregs[b4] + iregs[c4];
                    break;
                case EOperation.k_I32Sub:
                    iregs[a4] = iregs[b4] - iregs[c4];
                    break;
                case EOperation.k_I32Mul:
                    iregs[a4] = iregs[b4] * iregs[c4];
                    break;
                case EOperation.k_I32Div:
                    iregs[a4] = iregs[b4] / iregs[c4];
                    break;

                case EOperation.k_I32Mad:
                    iregs[a4] = iregs[b4] + iregs[c4] * iregs[d4];
                    break;

                case EOperation.k_F32Add:
                    fregs[a4] = fregs[b4] + fregs[c4];
                    break;
                case EOperation.k_F32Sub:
                    fregs[a4] = fregs[b4] - fregs[c4];
                    break;
                case EOperation.k_F32Mul:
                    fregs[a4] = fregs[b4] * fregs[c4];
                    break;
                case EOperation.k_F32Div:
                    fregs[a4] = fregs[b4] / fregs[c4];
                    break;


                //
                // Relational operations
                //

                case EOperation.k_I32LessThan:
                    iregs[a4] = Number(iregs[b4] < iregs[c4]);
                    break;
                case EOperation.k_I32GreaterThan:
                    iregs[a4] = Number(iregs[b4] > iregs[c4]);
                    break;
                case EOperation.k_I32LessThanEqual:
                    iregs[a4] = Number(iregs[b4] <= iregs[c4]);
                    break;
                case EOperation.k_I32GreaterThanEqual:
                    iregs[a4] = Number(iregs[b4] >= iregs[c4]);
                    break;

                case EOperation.k_F32LessThan:
                    fregs[a4] = Number(fregs[b4] < fregs[c4]);
                    break;
                case EOperation.k_F32GreaterThan:
                    fregs[a4] = Number(fregs[b4] > fregs[c4]);
                    break;
                case EOperation.k_F32LessThanEqual:
                    fregs[a4] = Number(fregs[b4] <= fregs[c4]);
                    break;
                case EOperation.k_F32GreaterThanEqual:
                    fregs[a4] = Number(fregs[b4] >= fregs[c4]);
                    break;

                //
                // intrinsics
                //

                case EOperation.k_F32Frac:
                    // same as frac() in HLSL
                    fregs[a4] = fregs[b4] - Math.floor(fregs[b4]);
                    break;
                case EOperation.k_F32Floor:
                    fregs[a4] = Math.floor(fregs[b4]);
                    break;

                case EOperation.k_F32Sin:
                    fregs[a4] = Math.sin(fregs[b4]);
                    break;
                case EOperation.k_F32Cos:
                    fregs[a4] = Math.cos(fregs[b4]);
                    break;

                case EOperation.k_F32Abs:
                    fregs[a4] = Math.abs(fregs[b4]);
                    break;
                case EOperation.k_F32Sqrt:
                    fregs[a4] = Math.sqrt(fregs[b4]);
                    break;
                case EOperation.k_F32Min:
                    fregs[a4] = Math.min(fregs[b4], fregs[c4]);
                    break;
                case EOperation.k_F32Max:
                    fregs[a4] = Math.max(fregs[b4], fregs[c4]);
                    break;

                //
                // Cast
                //

                case EOperation.k_F32ToI32:
                    iregs[a4] = Math.trunc(fregs[b4]);
                    break;
                case EOperation.k_I32ToF32:
                    // nothing to do here :)
                    fregs[a4] = iregs[b4];
                    break;


                //
                // Flow controls
                //

                case EOperation.k_Jump:
                    // TODO: don't use multiplication here
                    i4 = a * 5;
                    continue;
                    break;
                case EOperation.k_JumpIf:
                    i4 = iregs[a4] !== 0
                        ? i4 + 5 /* skip one instruction */
                        : i4;    /* do nothing (cause next instruction must always be Jump) */
                    break;
                case EOperation.k_Ret:
                    {
                        break end;
                    }
                    break;
                default:
                    console.error(`unknown operation found: ${op}`);
            }
            i4 += 5;
        }

        return VM.regs;
    }
}

interface Bundle {
    instructions: Uint32Array;
    constants: Uint8Array;
    input: Uint8Array[];
    layout: IMap<number>;
}

export function load(code: Uint8Array): Bundle {
    let chunks = decodeChunks(code);

    let codeChunk = chunks[EChunkType.k_Code];
    assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));

    let constChunk = chunks[EChunkType.k_Constants];
    let layoutChunk = chunks[EChunkType.k_Layout];

    let instructions = decodeCodeChunk(codeChunk);
    let constants = decodeConstChunk(constChunk);
    let layout = decodeLayoutChunk(layoutChunk);
    let input = null;

    return { instructions, constants, input, layout };
}

export function play(pack: Bundle): Uint8Array {
    return VM.play(pack);
}


function asNativeVector(elementDecoder: (u8: Uint8Array) => any, value: Uint8Array, length: number, stride = 4): any[] {
    const vector = [];
    for (let i = 0; i < length; ++i) {
        vector.push(elementDecoder(value.subarray(stride * i, stride * i + stride)));
    }
    return vector;
}

const asInt = u8ArrayAsI32;
const asUint = u8a => (asInt(u8a) >>> 0);
const asFloat = u8ArrayAsF32;
const asBool = u8a => asInt(u8a) !== 0;

export function asNative(result: Uint8Array, layout: ITypeInstruction): any {
    // TODO: remove it?
    while (layout !== layout.baseType) {
        layout = layout.baseType;
    }
    switch (layout.name) {
        case 'bool':
            return asBool(result);
        case 'int':
            return asInt(result);
        case 'float':
            return asFloat(result);
        case 'uint':
            return asUint(result);
        case 'uint2':
        case 'uint3':
        case 'uint4':
            return asNativeVector(asUint, result, layout.length, 4);
        case 'int2':
        case 'int3':
        case 'int4':
            return asNativeVector(asInt, result, layout.length, 4);
        case 'float2':
        case 'float3':
        case 'float4':
            return asNativeVector(asFloat, result, layout.length, 4);
    }

    if (layout.isComplex()) {
        let complex = {};
        layout.fields.forEach(field => {
            const { type, type: { padding, size } } = field;
            complex[field.name] = asNative(result.subarray(padding, padding + size), type);
        });
        return complex;
    }

    if (layout.isNotBaseArray()) {
        return asNativeVector(u8a => asNative(u8a, layout.arrayElementType), result, layout.length, layout.arrayElementType.size);
    }

    assert(false, `not implemented: ${layout.toCode()}`);
    return null;
}


export async function evaluate(code: Uint8Array): Promise<any>;
export async function evaluate(expr: string, document: ISLDocument): Promise<any>;
export async function evaluate(param: string | Uint8Array, param2?: ISLDocument): Promise<any> {
    let code: Uint8Array;
    if (isString(arguments[0])) {
        const expr = <string>arguments[0];
        const slDocument = <ISLDocument>arguments[1];
        const program = await Bytecode.translateExpression(expr, slDocument);
        if (isNull(program)) {
            return null;
        }
        code = program.code;
        return asNative(play(load(code)), program.layout);
    } else {
        code = arguments[0];
    }

    return play(load(code));
}


