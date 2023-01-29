import { assert, isDef, isDefAndNotNull } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { CBUFFER0_REGISTER, SRV0_REGISTER, UAV0_REGISTER, SRV_TOTAL, UAV_TOTAL, CBUFFER_TOTAL } from "@lib/fx/bytecode/Bytecode";
import { u8ArrayAsI32, u8ArrayToI32 } from "@lib/fx/bytecode/common";
import InstructionList from "@lib/fx/bytecode/InstructionList";
import * as Bundle from "@lib/idl/bytecode";
import { IMap } from "@lib/idl/IMap";
import sizeof from "@lib/fx/bytecode/sizeof";
import { TypeFieldT, TypeLayoutT } from "@lib/idl/bundles/FxBundle_generated";
import { asNativeRaw, fromNativeRaw } from "@lib/fx/bytecode/VM/native";

let { EChunkType, EOperation } = Bundle;

interface TSBundleMemory extends Bundle.IMemory
{
    buffer: Int32Array;
}

export function asBundleMemory(data: ArrayBufferView): TSBundleMemory
{
    const buffer = data instanceof Int32Array 
        ? data 
        : new Int32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
    return { buffer };
}

export function fromBundleMemory(mem: Bundle.IMemory)
{
    return (<TSBundleMemory>mem).buffer;
}


function slotToShaderLikeRegister(slot: number) {
    if (slot >= CBUFFER0_REGISTER && slot - CBUFFER0_REGISTER < CBUFFER_TOTAL) 
        return `b${slot - CBUFFER0_REGISTER}`;
    if (slot >= SRV0_REGISTER && slot - SRV0_REGISTER < SRV_TOTAL) 
        return `t${slot - SRV0_REGISTER}`;
    if (slot >= UAV0_REGISTER && slot - UAV0_REGISTER < UAV_TOTAL) 
        return `u${slot - UAV0_REGISTER}`;
    return `[ invalid slot | ${slot} ]`;
}


function exposeInvalidInputError(iinput: Int32Array[], slot: number) {
    const reg = slotToShaderLikeRegister(slot);
    if (isDefAndNotNull(iinput[slot])) return `resource usage out of range, register: ${reg}`;
    return `missing resource is found, register: ${reg}`;
}


export class TSBundle implements Bundle.IBundle
{
    private instructions: Uint32Array;
    private inputs: Int32Array[];
    private layout: Bundle.Constant[];
    private externs: Bundle.Extern[];
    private ncalls: Function[];         // native calls

    private static $regs = new ArrayBuffer(512 * 16);
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

        const constants = decodeConstChunk(chunks[EChunkType.k_Constants]);
        this.instructions = decodeCodeChunk(codeChunk);
        this.layout = decodeLayoutChunk(chunks[EChunkType.k_Layout]);
        this.externs = decodeExternsChunk(chunks[EChunkType.k_Externs]);
        this.inputs = Array<Int32Array>(64).fill(null);
        this.inputs[CBUFFER0_REGISTER] = new Int32Array(constants.buffer, constants.byteOffset, constants.length >> 2);

        const undefFn = (extern: Bundle.Extern) => (a, b, c, d, e, f) => { 
            console.error(`[native call <${extern.name}> was not provided]`, [a, b, c, d, e, f].filter(x => isDef(x))); 
        };

        const traceFn = (a, b, c, d, e, f) => { 
            console.log.apply(null, [a, b, c, d, e, f].filter(x => isDef(x))); 
        };

        this.ncalls = Array<Function>(this.externs.length).fill(null).map(
            (fn, id) => (this.externs[id].name === 'trace' ? traceFn : undefFn(this.externs[id]))
        );
    }

    private asNative(u8: Uint8Array, layout: TypeLayoutT): any {
        switch (layout.name) {
            // IP: experimental way to resolve string (useful for debug purposes like trace())
            case 'string': {
                let byteOffset = u8ArrayToI32(u8);
                let i32a = this.inputs[CBUFFER0_REGISTER];
                let len = i32a[byteOffset >> 2];
                let u8a = new Uint8Array(i32a.buffer, i32a.byteOffset + byteOffset + 4, len);
                return String.fromCharCode(...u8a);
            }
        }
        return asNativeRaw(u8, layout);
    }
    

    play(): Uint8Array {
        const ilist = this.instructions;
        const iregs = TSBundle.iregs;
        const fregs = TSBundle.fregs;
        const regs = TSBundle.regs;
        const iinput = this.inputs;

        let i5 = 0;                      // current instruction;
        end:
        while (1) {
            let op = ilist[i5];
            let a = ilist[i5 + 1];
            let b = ilist[i5 + 2];
            let c = ilist[i5 + 3];
            let d = ilist[i5 + 4];
            
            switch (op) {
                // registers
                case EOperation.k_I32SetConst:
                    // assert(iregs.length > a, `[iregs.length > a] where iregs.length = ${iregs.length}, a = ${a}`);
                    iregs[a] = b;
                    break;
                case EOperation.k_I32LoadRegister:
                    // assert(iregs.length > b, `[iregs.length > b] where iregs.length = ${iregs.length}, b = ${b}`);
                    // assert(iregs.length > a, `[iregs.length > a] where iregs.length = ${iregs.length}, a = ${a}`);
                    iregs[a] = iregs[b];
                    break;
                // inputs
                case EOperation.k_I32LoadInput:
                    // assert(iinput[a], exposeInvalidInputError(iinput, a));
                    // assert(iinput[a].length > c);
                    // assert(iregs.length > b);
                    iregs[b] = iinput[a][c];
                    break;
                case EOperation.k_I32StoreInput:
                    // assert(iinput[a], exposeInvalidInputError(iinput, a));    
                    // assert(iinput[a].length > b);
                    // assert(iregs.length > c);
                    iinput[a][b] = iregs[c];
                    break;
                // registers pointers    
                // a => dest
                // b => source pointer
                // c => offset
                case EOperation.k_I32LoadRegistersPointer:
                    // assert(iregs.length > (iregs[b] + c), `[iregs.length > (iregs[b] + c)] where iregs.length = ${iregs.length}, iregs[b] = ${iregs[b]}, b = ${b}, c = ${c}`);
                    // assert(iregs.length > a);
                    iregs[a] = iregs[iregs[b] + c];
                    break;
                case EOperation.k_I32StoreRegisterPointer:
                    // assert(iregs.length > (iregs[a] + c));
                    // assert(iregs.length > b);
                    iregs[iregs[a] + c] = iregs[b];
                    break;
                // input pointers
                // a => input index
                // b => dest
                // c => source pointer
                // d => offset
                case EOperation.k_I32LoadInputPointer:
                    // assert(iinput[a], exposeInvalidInputError(iinput, a));  
                    // assert(iinput[a].length > (iregs[c] + d));
                    // assert(iregs.length > b);
                    iregs[b] = iinput[a][iregs[c] + d];
                    break;
                case EOperation.k_I32StoreInputPointer:
                    // assert(iinput[a], exposeInvalidInputError(iinput, a));  
                    // assert(iinput[a].length > (iregs[b] + d));
                    // assert(iregs.length > c);
                    iinput[a][iregs[b] + d] = iregs[c];
                    break;
                
                case EOperation.k_I32TextureLoad:
                    // a - destination  (always float4)
                    // b - texture      (input index)
                    // c - arguments    (int3 uv)
                    {
                        const layout = iinput[b];
                        const u = iregs[c];
                        const v = iregs[c + 1];
                        const w = layout[0];
                        const h = layout[1];
                        // assert(u >= 0 && u < w, `u(${u}) is out of borders [0, ${w})`);
                        // assert(v >= 0 && v < h, `u(${v}) is out of borders [0, ${h})`);
                        // const fmt = layout[2];
                        const texel = layout.subarray(/*desc(64) >> 2*/16)[w * v + u] >>> 0; // todo: use unsigned inputs
                        const iR = (texel) & 0xFF;
                        const iG = (texel >> 8) & 0xFF;
                        const iB = (texel >> 16) & 0xFF;
                        const iA = (texel >> 24) & 0xFF;
                        fregs.set([ iR / 255.0, iG / 255.0, iB / 255.0, iA / 255.0 ], a);
                    }
                    break;
                
                case EOperation.k_I32ExternCall:
                    {
                        const id = a;
                        const { params, ret } = this.externs[id];
                        const retOffset = (b << 2);
                        // todo: support out arguments
                        let paramOffset = retOffset + ret.size;
                        let args = new Array(params.length);
                        for (let i = 0; i < params.length; ++ i) {
                            let p = params[i];
                            let u8 = regs.subarray(paramOffset, paramOffset + p.size);
                            args[i] = this.asNative(u8, p);
                            paramOffset += p.size;
                            assert(p.size % 4 === 0);
                        }
                        const res = this.ncalls[a].apply(null, args);
                        if (ret.size) {
                            regs.set(fromNativeRaw(res, ret), retOffset);
                        }
                    }
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
                case EOperation.k_I32Mod:
                    iregs[a] = iregs[b] % iregs[c];
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
                case EOperation.k_F32Mod:
                    fregs[a] = fregs[b] % fregs[c];
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
                case EOperation.k_JumpIf:
                    i5 = iregs[a] !== 0
                        ? i5 + InstructionList.STRIDE /* skip one instruction */
                        : i5;                         /* do nothing (cause next instruction must always be Jump) */
                    break;
                case EOperation.k_Jump:
                    // TODO: don't use multiplication here
                    i5 = a * InstructionList.STRIDE;
                    continue;
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

        return TSBundle.regs;
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
        return asBundleMemory(this.inputs[slot]);
    }


    setConstant(name: string, value: Uint8Array): boolean {
        const layout = this.layout;
        const reflection = layout.find(entry => entry.name === name);
        const constants = this.inputs[CBUFFER0_REGISTER];
    
        if (!reflection) {
            return false;
        }
    
        const dst = new DataView(constants.buffer, constants.byteOffset + reflection.offset);
        const src = new DataView(value.buffer, value.byteOffset);
    
        // TODO: validate layout / constant type in memory / size
        switch (reflection.type) {
            case 'float':
                dst.setFloat32(0, src.getFloat32(0, true), true);
                break;
            case 'int':
                dst.setInt32(0, src.getInt32(0, true), true);
                break;
            case 'uint':
                dst.setUint32(0, src.getUint32(0, true), true);
                break;
            case 'float2':
                dst.setFloat32(0, src.getFloat32(0, true), true);
                dst.setFloat32(4, src.getFloat32(4, true), true);
                break;
            case 'float3':
                dst.setFloat32(0, src.getFloat32(0, true), true);
                dst.setFloat32(4, src.getFloat32(4, true), true);
                dst.setFloat32(8, src.getFloat32(8, true), true);
                break;
            case 'float4':
                dst.setFloat32(0, src.getFloat32(0, true), true);
                dst.setFloat32(4, src.getFloat32(4, true), true);
                dst.setFloat32(8, src.getFloat32(8, true), true);
                dst.setFloat32(12, src.getFloat32(12, true), true);
                break;
            default:
                assert(false, 'unsupported');
        }
    
        return true;
    }

    getLayout(): Bundle.Constant[] {
        return this.layout;
    }

    getExterns(): Bundle.Extern[] {
        return this.externs;
    }

    setExtern(id: number, extern: Function): void {
        this.ncalls[id] = extern;
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
    
        const memory = asBundleMemory(new Int32Array(size >> 2));
        const data = asBundleMemory(memory.buffer.subarray(counterSize >> 2));
        
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
    let content: Uint8Array = null;
    try {
        content = new Uint8Array(code.buffer, code.byteOffset + 8, byteLength);
    } catch (e)
    {
        console.log(e);
    }

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

function decodeTypeField(data: Uint8Array, field: TypeFieldT): number {
    let readed = 0;
    field.padding = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;
    field.size = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;

    const semanticLength = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;
    field.semantic = String.fromCharCode(...data.subarray(readed, readed + semanticLength));
    readed += semanticLength;

    const nameLength = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;
    field.name = String.fromCharCode(...data.subarray(readed, readed + nameLength));
    readed += nameLength;

    let type: TypeLayoutT = {} as any;
    readed += decodeTypeLayout(data.subarray(readed), type);
    field.type = type;

    return readed;
}

function decodeTypeLayout(data: Uint8Array, layout: TypeLayoutT): number {
    let readed = 0;
    layout.size = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;
    layout.length = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;

    const nameLength = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;
    layout.name = String.fromCharCode(...data.subarray(readed, readed + nameLength));
    readed += nameLength;

    let count = u8ArrayToI32(data.subarray(readed, readed + 4));
    readed += 4;

    for (let i = 0; i < count; ++ i) {
        let fiedl: TypeFieldT = {} as any;
        readed += decodeTypeField(data.subarray(readed), fiedl);
        layout.fields ||= [];
        layout.fields.push(fiedl);
    }

    return readed;
}

export function decodeExternsChunk(externsChunk: Uint8Array): Bundle.Extern[] {
    let readed = 0;
    let externCount = u8ArrayToI32(externsChunk.subarray(readed, readed + 4));
    readed += 4;

    let externs: Bundle.Extern[] = [];
    for (let i = 0; i < externCount; ++i) {
        const id = u8ArrayToI32(externsChunk.subarray(readed, readed + 4));
        readed += 4;

        const nameLength = u8ArrayToI32(externsChunk.subarray(readed, readed + 4));
        readed += 4;
        const name = String.fromCharCode(...externsChunk.subarray(readed, readed + nameLength));
        readed += nameLength;

        const ret: TypeLayoutT = {} as any; // hack
        readed += decodeTypeLayout(externsChunk.subarray(readed), ret);

        let paramCount = u8ArrayToI32(externsChunk.subarray(readed, readed + 4));
        readed += 4;

        const params: TypeLayoutT[] = [];
        for (let j = 0; j < paramCount; ++j) {
            const param: TypeLayoutT = {} as any; // hack
            readed += decodeTypeLayout(externsChunk.subarray(readed), param);
            params.push(param);
        }

        externs.push({ id, name, ret, params });
    }
    return externs;
}
