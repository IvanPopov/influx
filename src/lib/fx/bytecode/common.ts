import { IFunctionDeclInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

export const REG_INVALID = (-1 >>> 0);
export const DEFAULT_ENTRY_POINT_NAME = 'main';

// symbol name id generation;
export const sname = {
    i32: (i32: number) => `%i32:${i32}`,
    f32: (f32: number) => `%f32:${f32}`,
    var: (vdecl: IVariableDeclInstruction) => `${vdecl.name}:${vdecl.instructionID}`,
    fun: (fdecl: IFunctionDeclInstruction) => `${fdecl.name}:${fdecl.instructionID}`,

    // addr: (addr: number) => sname.i32(addr)
};

// aux functions for packing routines
export const i32ToU8Array = (i32: number) => Array(4).fill(0).map((u8, i, self) => (i32 >> (i) * 8) & (0xff));
export const u8ArrayToI32 = (arr: Uint8Array | Array<number>) => (arr as number[]).reduce((acc, cv, i, self) => acc | (cv << (i) * 8), 0);

// Uint8Array => Int32Array conversion
export const u8ArrayAsI32 = (arr: Uint8Array) => ((arr[0]) | (arr[1] << 8) | (arr[2] << 16) | (arr[3] << 24));
export const u8ArrayAsF32 = (arr: Uint8Array) => new Float32Array(arr.buffer, arr.byteOffset)[0];


const ab = new ArrayBuffer(4);
const f32a = new Float32Array(ab);
const i32a = new Int32Array(ab);
export function f32Asi32(f32: number): number {
    f32a[0] = f32;
    return i32a[0];
}

export function i32Asf32(i32: number): number {
    i32a[0] = i32;
    return f32a[0];
}
