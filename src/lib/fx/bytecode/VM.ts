import { assert, isDefAndNotNull } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IMap } from "@lib/idl/IMap";
// import { remote } from 'electron';
import * as isElectron from 'is-electron-renderer';
import { EChunkType } from "./Bytecode";

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

        // todo: handle correctly empty input
        let $input = data.input;
        for (let i = 0; i < 2; ++ i) {
            $input[i] = $input[i] || new Uint8Array(0);
        }
        let iinput = [
            new Int32Array($input[0].buffer, $input[0].byteOffset),
            new Int32Array($input[1].buffer, $input[1].byteOffset)
        ];

        end:
        while (i4 < ilist.length) {
            let op = ilist[i4];
            let a = ilist[i4 + 1];
            let b = ilist[i4 + 2];
            let c = ilist[i4 + 3];

            // todo: use already aligned adresses
            let a4 = a >> 2;
            let b4 = b >> 2;
            let c4 = c >> 2;

            switch (op) {
                case EOperation.k_I32LoadConst:
                {
                    iregs[a4] = icb[b4]
                }
                break;
                case EOperation.k_I32LoadInput:
                {
                    iregs[b4] = iinput[a][c4];
                }
                break;
                case EOperation.k_I32StoreInput:
                {
                    iinput[a][b4] = iregs[c4];
                }
                break;
                case EOperation.k_I32MoveRegToReg:
                    iregs[a4] = iregs[b4];
                break;

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

                case EOperation.k_F32ToI32:
                    iregs[a4] = Math.trunc(fregs[b4]);
                break;
                case EOperation.k_I32ToF32:
                    // nothing to do here :)
                    fregs[a4] = iregs[b4];
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
}

export function load(code: Uint8Array): Bundle {
    let chunks = decodeChunks(code);

    let codeChunk = chunks[EChunkType.k_Code];
    assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));

    let constChunk = chunks[EChunkType.k_Constants];

    let instructions = decodeCodeChunk(codeChunk);
    let constants = decodeConstChunk(constChunk);
    let input = null;

    return { instructions, constants, input };
}

export function play(pack: Bundle): INT32 {
    return VM.play(pack);
}


export function evaluate(code: Uint8Array): INT32 {
    return play(load(code));
}

