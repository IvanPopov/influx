import { assert, isDefAndNotNull } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IMap } from "@lib/idl/IMap";
// import { remote } from 'electron';
import * as isElectron from 'is-electron-renderer';
import { EChunkType, REG_RAX } from "./Bytecode";

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
    static play(data: { instructions: Uint32Array; constants: Uint8Array; }): INT32 {
        let i4 = 0;                      // current instruction;
        let ilist = data.instructions;

        let $regs = new ArrayBuffer(512 * 4);
        let rregs = new Uint8Array($regs);
        let iregs = new Int32Array($regs);
        let fregs = new Float32Array($regs);

        let cb = data.constants;

        end:
        while (i4 < ilist.length) {
            let op = ilist[i4];
            let a = ilist[i4 + 1];
            let b = ilist[i4 + 2];
            let c = ilist[i4 + 3];

            let a4 = a >> 2;
            let b4 = b >> 2;
            let c4 = c >> 2;

            switch (op) {
                case EOperation.k_LoadConst:
                {
                    assert(c/*size*/ == 4);
                    // copy 4 bytes
                    rregs[a    ] = cb[b    ];
                    rregs[a + 1] = cb[b + 1];
                    rregs[a + 2] = cb[b + 2];
                    rregs[a + 3] = cb[b + 3];
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
            }
            i4 += 4;
        }

        // if (!isElectron) {
            // alert(String());
        // } else {
            // remote.dialog.showMessageBox({ type: 'info', title: 'evaluation result', message: `${regs[REG_RAX]}` }, () => {});
        // }

        return iregs[REG_RAX >> 2];
    }
}

interface Package {
    instructions: Uint32Array;
    constants: Uint8Array;
}

export function load(code: Uint8Array): Package {
    let chunks = decodeChunks(code);

    let codeChunk = chunks[EChunkType.k_Code];
    assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));

    let constChunk = chunks[EChunkType.k_Constants];

    let instructions = decodeCodeChunk(codeChunk);
    let constants = decodeConstChunk(constChunk);

    return { instructions, constants };
}

export function play(pack: Package): INT32 {
    return VM.play(pack);
}


export function evaluate(code: Uint8Array): INT32 {
    return play(load(code));
}

