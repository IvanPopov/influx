import { EChunkTypes, REG_RAX } from "./Bytecode";
import { EOperations } from "../../idl/bytecode/EOperations";
import { assert } from "./../../common";
import { constants } from "perf_hooks";
import { remote } from 'electron';

interface IChunk {
    type: EChunkTypes;
    byteLength: number;
    content: Uint8Array;
    next: IChunk;
}

function decodeChunk(code: Uint8Array): IChunk {
    let view = new DataView(code.buffer, code.byteOffset, code.byteLength);
    let type = view.getUint32(0, true);
    let byteLength = view.getUint32(4, true) << 2;
    let content = new Uint8Array(code.buffer, code.byteOffset + 8, byteLength);
    let nextChunkOffset = content.byteOffset + content.byteLength;
    let next = nextChunkOffset < code.buffer.byteLength ? decodeChunk(new Uint8Array(content.buffer, nextChunkOffset)): null;
    return { type, byteLength, content, next };
}

class VM {
    constants: Uint8Array;
    instructions: Uint32Array;

    play() {
        let i4 = 0;                      // current instruction;
        let ilist = this.instructions;
        let regs = new Uint32Array(512);
        let cb = this.constants;

        end:
        while (i4 < ilist.length) {
            let op = ilist[i4 + 3];
            // console.log(op, ilist[i4 +0], ilist[i4 + 1], ilist[i4 + 2]);
            switch (op) {
                case EOperations.k_Load:
                {
                    let dst = ilist[i4];
                    let caddr = ilist[i4 + 1];
                    let size = ilist[i4 + 2];
                    assert(size == 4);
                    regs[dst] = cb[caddr];
                }
                break;
                case EOperations.k_Move:
                {
                    let dst = ilist[i4];
                    let src = ilist[i4 + 1];
                    regs[dst] = regs[src];
                }
                break;
                case EOperations.k_Add:
                {
                    let dst = ilist[i4];
                    let a = ilist[i4 + 1];
                    let b = ilist[i4 + 2];
                    regs[dst] = regs[a] + regs[b];
                }
                break;
                case EOperations.k_Ret:
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

export function evaluate(code: Uint8Array)
{
    let vm = new VM;
    let chunk = decodeChunk(code);
    while (chunk) {
        switch (chunk.type) {
            case EChunkTypes.k_Constants:
                vm.constants = chunk.content;
            break;
            case EChunkTypes.k_Code:
                vm.instructions = new Uint32Array(chunk.content.buffer, chunk.content.byteOffset, chunk.content.byteLength >> 2);
            break;
        }
        chunk = chunk.next;
    }
    vm.play();
}