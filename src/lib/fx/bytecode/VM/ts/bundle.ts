import { assert, isDefAndNotNull } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { CBUFFER0_REGISTER } from "@lib/fx/bytecode/Bytecode";
import { u8ArrayToI32 } from "@lib/fx/bytecode/common";
import InstructionList from "@lib/fx/bytecode/InstructionList";
import * as Bundle from "@lib/idl/bytecode";
import { IMap } from "@lib/idl/IMap";
import sizeof from "@lib/fx/bytecode/sizeof";

let { EChunkType, EOperation } = Bundle;

export interface TSBundleMemory extends Bundle.IMemory
{
    buffer: Int32Array;
}

export class TSBundle implements Bundle.IBundle
{
    private instructions: Uint32Array;
    private inputs: Int32Array[];
    private layout: Bundle.Constant[];

    private static $regs = new ArrayBuffer(512 * 4);
    private static iregs = new Int32Array(TSBundle.$regs);
    private static fregs = new Float32Array(TSBundle.$regs);
    private static regs = new Uint8Array(TSBundle.$regs);

    private static Gid = new Int32Array([0, 0, 0]);     // uint3 Gid: SV_GroupID    
    private static Gi = new Int32Array([0]);            // uint GI: SV_GroupIndex
    private static GTid = new Int32Array([0, 0, 0]);    // uint3 GTid: SV_GroupThreadID
    private static DTid = new Int32Array([0, 0, 0]);    // uint3 DTid: SV_DispatchThreadID

    constructor(public debugName: string, data: Uint8Array)
    {
        this.load(data);
    }

    private load(code: Uint8Array) {
        const chunks = decodeChunks(code);
    
        const codeChunk = chunks[EChunkType.k_Code];
        assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));

        const constChunk = chunks[EChunkType.k_Constants];
        const layoutChunk = chunks[EChunkType.k_Layout];
        const constants = decodeConstChunk(constChunk);

        this.instructions = decodeCodeChunk(codeChunk);
        this.layout = decodeLayoutChunk(layoutChunk);
        this.inputs = Array<Int32Array>(64).fill(null);
        this.inputs[CBUFFER0_REGISTER] = new Int32Array(constants.buffer, constants.byteOffset, constants.length >> 2);
    }
    

    play(): TSBundleMemory {
        const ilist = this.instructions;
        const iregs = TSBundle.iregs;
        const fregs = TSBundle.fregs;
        const iinput = this.inputs;

        let i5 = 0;                      // current instruction;
        end:
        while (i5 < ilist.length) {
            let op = ilist[i5];
            let a = ilist[i5 + 1];
            let b = ilist[i5 + 2];
            let c = ilist[i5 + 3];
            let d = ilist[i5 + 4];

            switch (op) {
                // registers
                case EOperation.k_I32SetConst:
                    iregs[a] = b;
                    break;
                case EOperation.k_I32LoadRegister:
                    iregs[a] = iregs[b];
                    break;
                // inputs
                case EOperation.k_I32LoadInput:
                    iregs[b] = iinput[a][c];
                    break;
                case EOperation.k_I32StoreInput:
                    iinput[a][b] = iregs[c];
                    break;
                // registers pointers    
                // a => dest
                // b => source pointer
                // c => offset
                case EOperation.k_I32LoadRegistersPointer:
                    iregs[a] = iregs[iregs[b] + c];
                    break;
                case EOperation.k_I32StoreRegisterPointer:
                    iregs[iregs[a] + c] = iregs[b];
                    break;
                // input pointers
                // a => input index
                // b => dest
                // c => source pointer
                // d => offset
                case EOperation.k_I32LoadInputPointer:
                    iregs[b] = iinput[a][iregs[c] + d];
                    break;
                case EOperation.k_I32StoreInputPointer:
                    iinput[a][iregs[b] + d] = iregs[c];
                    break;

                //
                // Arithmetic operations
                //

                case EOperation.k_I32Add:
                    iregs[a] = iregs[b] + iregs[c];
                    break;
                case EOperation.k_I32Sub:
                    iregs[a] = iregs[b] - iregs[c];
                    break;
                case EOperation.k_I32Mul:
                    iregs[a] = iregs[b] * iregs[c];
                    break;
                case EOperation.k_I32Div:
                    iregs[a] = iregs[b] / iregs[c];
                    break;

                case EOperation.k_I32Mad:
                    iregs[a] = iregs[b] + iregs[c] * iregs[d];
                    break;
                
                case EOperation.k_I32Min:
                    iregs[a] = Math.min(iregs[b], iregs[c]);
                    break;
                case EOperation.k_I32Max:
                    iregs[a] = Math.max(iregs[b], iregs[c]);
                    break;

                case EOperation.k_F32Add:
                    fregs[a] = fregs[b] + fregs[c];
                    break;
                case EOperation.k_F32Sub:
                    fregs[a] = fregs[b] - fregs[c];
                    break;
                case EOperation.k_F32Mul:
                    fregs[a] = fregs[b] * fregs[c];
                    break;
                case EOperation.k_F32Div:
                    fregs[a] = fregs[b] / fregs[c];
                    break;


                //
                // Relational operations
                //

                case EOperation.k_U32LessThan:
                    iregs[a] = +((iregs[b] >>> 0) < (iregs[c] >>> 0));
                    break;
                case EOperation.k_U32GreaterThanEqual:
                    iregs[a] = +((iregs[b] >>> 0) >= (iregs[c] >>> 0));
                    break;
                case EOperation.k_I32LessThan:
                    iregs[a] = +(iregs[b] < iregs[c]);
                    break;
                case EOperation.k_I32GreaterThanEqual:
                    iregs[a] = +(iregs[b] >= iregs[c]);
                    break;
                case EOperation.k_I32Equal:
                    iregs[a] = +(iregs[b] === iregs[c]);
                    break;
                case EOperation.k_I32NotEqual:
                    iregs[a] = +(iregs[b] !== iregs[c]);
                    break;
                case EOperation.k_I32Not:
                    iregs[a] = +(!iregs[b]);
                    break;

                case EOperation.k_F32LessThan:
                    fregs[a] = +(fregs[b] < fregs[c]);
                    break;
                case EOperation.k_F32GreaterThanEqual:
                    fregs[a] = +(fregs[b] >= fregs[c]);
                    break;

                //
                // Logical operations
                //


                case EOperation.k_I32LogicalOr:
                    iregs[a] = +(iregs[b] || iregs[c]);
                    break;
                case EOperation.k_I32LogicalAnd:
                    iregs[a] = +(iregs[b] && iregs[c]);
                    break;

                //
                // intrinsics
                //

                case EOperation.k_F32Frac:
                    // same as frac() in HLSL
                    fregs[a] = fregs[b] - Math.floor(fregs[b]);
                    break;
                case EOperation.k_F32Floor:
                    fregs[a] = Math.floor(fregs[b]);
                    break;
                case EOperation.k_F32Ceil:
                    fregs[a] = Math.ceil(fregs[b]);
                    break;

                case EOperation.k_F32Sin:
                    fregs[a] = Math.sin(fregs[b]);
                    break;
                case EOperation.k_F32Cos:
                    fregs[a] = Math.cos(fregs[b]);
                    break;

                case EOperation.k_F32Abs:
                    fregs[a] = Math.abs(fregs[b]);
                    break;
                case EOperation.k_F32Sqrt:
                    fregs[a] = Math.sqrt(fregs[b]);
                    break;
                case EOperation.k_F32Min:
                    fregs[a] = Math.min(fregs[b], fregs[c]);
                    break;
                case EOperation.k_F32Max:
                    fregs[a] = Math.max(fregs[b], fregs[c]);
                    break;

                //
                // Cast
                //


                case EOperation.k_U32ToF32:
                    fregs[a] = iregs[b] >>> 0;
                    break;
                case EOperation.k_I32ToF32:
                    fregs[a] = iregs[b];
                    break;
                case EOperation.k_F32ToU32: // TODO: remove it?
                case EOperation.k_F32ToI32:
                    iregs[a] = Math.trunc(fregs[b]);
                    break;

                //
                // Flow controls
                //

                case EOperation.k_Jump:
                    // TODO: don't use multiplication here
                    i5 = a;
                    continue;
                case EOperation.k_JumpIf:
                    i5 = iregs[a] !== 0
                        ? i5 + InstructionList.STRIDE /* skip one instruction */
                        : i5;                         /* do nothing (cause next instruction must always be Jump) */
                    break;
                case EOperation.k_Ret:
                    {
                        break end;
                    }
                    break;
                default:
                    console.error(`${this.debugName} | unknown operation found: ${op}`);
            }
            i5 += InstructionList.STRIDE;
        }

        return { buffer: TSBundle.iregs, spec: 'js' };
    }




    dispatch(numgroups: Bundle.Numgroups, numthreads: Bundle.Numthreads) {
        const { x: nGroupX, y: nGroupY, z: nGroupZ } = numgroups;
        const { x: nThreadX, y: nThreadY, z: nThreadZ } = numthreads;

        // TODO: get order from bundle
        const SV_GroupID = Bytecode.INPUT0_REGISTER + 0;
        const SV_GroupIndex = Bytecode.INPUT0_REGISTER + 1;
        const SV_GroupThreadID = Bytecode.INPUT0_REGISTER + 2;
        const SV_DispatchThreadID = Bytecode.INPUT0_REGISTER + 3;

        this.inputs[SV_GroupID] = TSBundle.Gid;
        this.inputs[SV_GroupIndex] = TSBundle.Gi;
        this.inputs[SV_GroupThreadID] = TSBundle.GTid;
        this.inputs[SV_DispatchThreadID] = TSBundle.DTid;

        for (let iGroupZ = 0; iGroupZ < nGroupZ; ++iGroupZ) {
            for (let iGroupY = 0; iGroupY < nGroupY; ++iGroupY) {
                for (let iGroupX = 0; iGroupX < nGroupX; ++iGroupX) {
                    TSBundle.Gid[0] = iGroupX;
                    TSBundle.Gid[1] = iGroupY;
                    TSBundle.Gid[2] = iGroupZ;

                    for (let iThreadZ = 0; iThreadZ < nThreadZ; ++iThreadZ) {
                        for (let iThreadY = 0; iThreadY < nThreadY; ++iThreadY) {
                            for (let iThreadX = 0; iThreadX < nThreadX; ++iThreadX) {
                                TSBundle.GTid[0] = iThreadX;
                                TSBundle.GTid[1] = iThreadY;
                                TSBundle.GTid[2] = iThreadZ;

                                TSBundle.DTid[0] = iGroupX * nThreadX + iThreadX;
                                TSBundle.DTid[1] = iGroupY * nThreadY + iThreadY;
                                TSBundle.DTid[2] = iGroupZ * nThreadZ + iThreadZ;

                                TSBundle.Gi[0] = iThreadZ * nThreadX * nThreadY + iThreadY * nThreadX + iThreadX;

                                this.play();
                            }
                        }
                    }
                }
            }
        }
    }

    setInput(slot: number, input: TSBundleMemory): void {
        this.inputs[slot] = input.buffer;
    }

    getInput(slot: number): TSBundleMemory {
        return { buffer: this.inputs[slot], spec: 'js' };
    }


    setConstant(name: string, value: number): boolean {
        const layout = this.layout;
        const reflection = layout.find(entry => entry.name === name);
        const constants = this.inputs[CBUFFER0_REGISTER];
    
        if (!reflection) {
            return false;
        }
    
        const view = new DataView(constants.buffer, constants.byteOffset + reflection.offset);
    
        // TODO: validate layout / constant type in memory / size
        switch (reflection.type) {
            case 'float':
                view.setFloat32(0, <number>value, true);
                break;
            case 'int':
                view.setInt32(0, <number>value, true);
                break;
            case 'uint':
                view.setUint32(0, <number>value, true);
                break;
            default:
                assert(false, 'unsupported');
        }
    
        return true;
    }

    getLayout(): Bundle.Constant[] {
        return this.layout;
    }

    static resetRegisters()
    {
        TSBundle.regs.fill(0);
    }

    static createUAV(name: string, elementSize: number, length: number, register: number): Bundle.IUAV {
        const counterSize = sizeof.i32();
        const size = counterSize + length * elementSize; // in bytes
        assert(size % sizeof.i32() === 0);
    
        const index = Bytecode.UAV0_REGISTER + register;
    
        const memory = <TSBundleMemory>{ buffer: new Int32Array((size + 3) >> 2), spec: 'js' };
        const data = <TSBundleMemory>{ buffer: memory.buffer.subarray(counterSize >> 2), spec: 'js' };
        
        const counter = memory.buffer.subarray(0, 1);
    
        counter[0] = 0; // reset counter
    
        return {
            name,
            // byte length of a single element
            elementSize,
            // number of elements
            length, 
            // register specified in the shader
            register,
    
            // [ elements ]
            data,
    
            // raw data [ counter, ...elements ]
            buffer: memory,
            // input index for VM
            index
        };
    }
}

type Chunk = Uint8Array;
type ChunkMap = IMap<Chunk>;

export function decodeChunks(code: Uint8Array, chunks?: ChunkMap): ChunkMap {
    if (!isDefAndNotNull(chunks)) {
        chunks = {};
    }

    const view = new DataView(code.buffer, code.byteOffset, code.byteLength);
    const type = view.getUint32(0, true);
    const byteLength = view.getUint32(4, true) << 2;
    const content = new Uint8Array(code.buffer, code.byteOffset + 8, byteLength);

    chunks[type] = content;

    const nextChunkOffset = content.byteOffset + content.byteLength;
    if (nextChunkOffset < code.buffer.byteLength) {
        decodeChunks(new Uint8Array(content.buffer, nextChunkOffset), chunks);
    }

    return chunks;
}


export function decodeCodeChunk(codeChunk: Uint8Array): Uint32Array {
    return new Uint32Array(codeChunk.buffer, codeChunk.byteOffset, codeChunk.byteLength >> 2);
}


export function decodeConstChunk(constChunk: Uint8Array): Uint8Array {
    return constChunk;
}


// TODO: rewrite with cleaner code
export function decodeLayoutChunk(layoutChunk: Uint8Array): Bundle.Constant[] {
    let readed = 0;
    let count = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
    readed += 4;

    let layout: Bundle.Constant[] = [];
    for (let i = 0; i < count; ++i) {
        const nameLength = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
        readed += 4;
        const name = String.fromCharCode(...layoutChunk.subarray(readed, readed + nameLength));
        readed += nameLength;

        const typeLength = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
        readed += 4;
        const type = String.fromCharCode(...layoutChunk.subarray(readed, readed + typeLength));
        readed += typeLength;

        const semanticLength = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
        readed += 4;
        const semantic = String.fromCharCode(...layoutChunk.subarray(readed, readed + semanticLength));
        readed += semanticLength;

        const offset = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
        readed += 4;
        const size = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
        readed += 4;
        
        layout.push({ name, type, offset, size, semantic });
    }
    return layout;
}

