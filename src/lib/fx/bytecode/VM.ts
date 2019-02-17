import { assert, isDefAndNotNull } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";
import { IMap } from "@lib/idl/IMap";
import { remote } from 'electron';
import { EChunkType, REG_RAX } from "./Bytecode";


type Chunk = Uint8Array;
type ChunkMap = IMap<Chunk>;

function decodeChunks(code: Uint8Array, chunks?: ChunkMap): ChunkMap {
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


function decodeCodeChunk(codeChunk: Uint8Array): Uint32Array {
    return new Uint32Array(codeChunk.buffer, codeChunk.byteOffset, codeChunk.byteLength >> 2);
}

class VM {
    static play(data: { instructions: Uint32Array; constants: Uint8Array; }) {
        let i4 = 0;                      // current instruction;
        let ilist = data.instructions;
        let regs = new Uint32Array(512);
        let cb = data.constants;

        end:
        while (i4 < ilist.length) {
            let op = ilist[i4];

            switch (op) {
                case EOperation.k_Load:
                {
                    let dst = ilist[i4 + 1];
                    let caddr = ilist[i4 + 2];
                    let size = ilist[i4 + 3];
                    assert(size == 4);
                    regs[dst] = cb[caddr];
                }
                break;
                case EOperation.k_Move:
                    regs[ilist[i4 + 1]] = regs[ilist[i4 + 2]];
                break;
                case EOperation.k_Add:
                    regs[ilist[i4 + 1]] = regs[ilist[i4 + 2]] + regs[ilist[i4 + 3]];
                break;
                case EOperation.k_Sub:
                    regs[ilist[i4 + 1]] = regs[ilist[i4 + 2]] - regs[ilist[i4 + 3]];
                break;
                case EOperation.k_Mul:
                    regs[ilist[i4 + 1]] = regs[ilist[i4 + 2]] * regs[ilist[i4 + 3]];
                break;
                case EOperation.k_Div:
                    regs[ilist[i4 + 1]] = regs[ilist[i4 + 2]] / regs[ilist[i4 + 3]];
                break;
                case EOperation.k_Ret:
                {
                    break end;
                }
                break;
            }
            i4 += 4;
        }

        // alert(String(regs[REG_RAX]));
        remote.dialog.showMessageBox({ type: 'info', title: 'evaluation result', message: `${regs[REG_RAX]}` }, () => {});
    }
}

function evaluate(code: Uint8Array)
{
    let chunks = decodeChunks(code);

    let codeChunk = chunks[EChunkType.k_Code];
    assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));

    let instructions = decodeCodeChunk(codeChunk);
    let constants = chunks[EChunkType.k_Constants];

    VM.play({ instructions, constants });
}

export default { evaluate, decodeChunks, decodeCodeChunk };