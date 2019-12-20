import { assert, isDefAndNotNull } from "@lib/common";
import { EChunkType, EOperation } from "@lib/idl/bytecode";
import { IMap } from "@lib/idl/IMap";
import { i32ToU8Array, u8ArrayToI32 } from "./common";

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

    static play(data: Bundle): INT32 {
        let i4 = 0;                      // current instruction;
        let ilist = data.instructions;

        let iregs = new Int32Array(VM.$regs);
        let fregs = new Float32Array(VM.$regs);

        let $cb = data.constants;
        let icb = new Int32Array($cb.buffer, $cb.byteOffset);
        let fcb = new Float32Array($cb.buffer, $cb.byteOffset);

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

            // TODO: use already aligned adresses
            let a4 = a >> 2;
            let b4 = b >> 2;
            let c4 = c >> 2;

            switch (op) {
                case EOperation.k_I32LoadConst:
                    {
                        iregs[a4] = icb[b4];
                    }
                    break;
                case EOperation.k_I32LoadInput:
                    {
                        iregs[b4] = iinput[a][c4];
                    }
                    break;
                case EOperation.k_I32MoveRegToReg:
                    iregs[a4] = iregs[b4];
                    break;
                case EOperation.k_I32StoreInput:
                    {
                        iinput[a][b4] = iregs[c4];
                    }
                    break;

                case EOperation.k_I32LoadRegistersPointer:
                case EOperation.k_I32LoadInputPointer:
                case EOperation.k_I32LoadConstPointer:
                    assert(false, 'not implemented');
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
                    i4 = a * 4;
                    continue;
                    break;
                case EOperation.k_Ret:
                    {
                        break end;
                    }
                    break;
                default:
                    console.error(`unknown operation found: ${op}`);
            }
            i4 += 4;
        }

        return iregs[0];
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

export function play(pack: Bundle): INT32 {
    return VM.play(pack);
}


export function evaluate(code: Uint8Array): INT32 {
    return play(load(code));
}

