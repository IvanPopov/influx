import { assert, isDef, isDefAndNotNull, isNull, isString } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode';
import { CBUFFER0_REGISTER, INPUT0_REGISTER } from "@lib/fx/bytecode/Bytecode";
import { u8ArrayToI32 } from "@lib/fx/bytecode/common";
import InstructionList from "@lib/fx/bytecode/InstructionList";
import { EChunkType, EOperation } from "@lib/idl/bytecode";
import { IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";

import { IConstantReflection } from "../ConstantPool";
import { asNative, asNativeViaAST, asNativeViaCDL } from "./native";

export { default as dispatch } from "./dispatch";
export { asNative, asNativeViaAST, asNativeViaCDL } from './native';
export { createUAV } from './uav';


declare const MODE: string;

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
export function decodeLayoutChunk(layoutChunk: Uint8Array): IConstantReflection[] {
    let readed = 0;
    let count = u8ArrayToI32(layoutChunk.subarray(readed, readed + 4));
    readed += 4;

    let layout: IConstantReflection[] = [];
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

export type INT32 = number;

class VM {
    static $regs = new ArrayBuffer(512 * 4);
    static iregs = new Int32Array(VM.$regs);
    static fregs = new Float32Array(VM.$regs);
    static regs = new Uint8Array(VM.$regs);

    static play(data: Bundle): Uint8Array {
        const ilist = data.instructions;
        const iregs = VM.iregs;
        const fregs = VM.fregs;
        const iinput = data.input;

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
                    console.error(`unknown operation found: ${op}`);
            }
            i5 += InstructionList.STRIDE;
        }

        return VM.regs;
    }
}

export interface Bundle {
    readonly instructions: Uint32Array;
    readonly input: Int32Array[];
    readonly layout: IConstantReflection[];
}

export function load(code: Uint8Array): Bundle {
    const chunks = decodeChunks(code);

    const codeChunk = chunks[EChunkType.k_Code];
    assert(isDefAndNotNull(codeChunk) && isDefAndNotNull(chunks[EChunkType.k_Constants]));
    const constChunk = chunks[EChunkType.k_Constants];
    const layoutChunk = chunks[EChunkType.k_Layout];

    const instructions = decodeCodeChunk(codeChunk);
    const constants = decodeConstChunk(constChunk);
    const layout = decodeLayoutChunk(layoutChunk);
    const input = Array<Int32Array>(64).fill(null);

    input[CBUFFER0_REGISTER] = new Int32Array(constants.buffer, constants.byteOffset, constants.length >> 2);

    return { instructions, input, layout };
}

export function play(bundle: Bundle, inputs: Int32Array[] = null): Uint8Array {
    if (inputs) {
        for (let i = 0; i < inputs.length; ++i) {
            bundle.input[INPUT0_REGISTER + i] = inputs[i];
        }
    }
    return VM.play(bundle);
}


export function resetRegisters(): void {
    VM.regs.fill(0);
}


export function asNativeFunction(fn: IFunctionDeclInstruction): Function
{
    const { code, cdl } = Bytecode.translate(fn);
    const bundle = load(code);
    return (...args: any[]) => {
        assert(!args || args.length === 0, 'arguments not supported');
        return asNativeViaCDL(VM.play(bundle), cdl);
    };
}

// export async function prebuildExpression(code: Uint8Array): Promise<Bundle>;
// export async function prebuildExpression(expr: string, document: ISLDocument): Promise<Bundle>;
// export async function prebuildExpression(param: string | Uint8Array, param2?: ISLDocument): Promise<Bundle> {
//     if (MODE === 'development') {
//         resetRegisters();
//     }

//     let code: Uint8Array;
//     if (isString(arguments[0])) {
//         const expr = <string>arguments[0];
//         const slDocument = <ISLDocument>arguments[1];
//         const program = await Bytecode.translateExpression(expr, slDocument);
//         if (isNull(program)) {
//             return null;
//         }
//         code = program.code;
//     } else {
//         code = arguments[0];
//     }

//     return load(code);
// }

// TODO: use bundle inside
export async function evaluate(code: Uint8Array): Promise<any>;
export async function evaluate(expr: string, document: ISLDocument): Promise<any>;
export async function evaluate(param: string | Uint8Array, param2?: ISLDocument): Promise<any> {
    if (MODE === 'development') {
        resetRegisters();
    }

    let code: Uint8Array;
    if (isString(arguments[0])) {
        const expr = <string>arguments[0];
        const slDocument = <ISLDocument>arguments[1];
        const program = await Bytecode.translateExpression(expr, slDocument);
        if (isNull(program)) {
            return null;
        }
        const { code, cdl } = program;
        return asNativeViaCDL(VM.play(load(code)), cdl);
    } else {
        code = arguments[0];
    }

    return VM.play(load(code));
}


export function setConstant(bundle: Bundle, name: string, value: number): boolean {
    const layout = bundle.layout;
    const reflection = layout.find(entry => entry.name === name);
    const constants = bundle.input[CBUFFER0_REGISTER];

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
