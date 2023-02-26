import { assert } from "@lib/common";
import { f32Asi32, i32ToU8Array, u8ArrayAsF32, u8ArrayAsI32 } from "@lib/fx/bytecode/common";
import { CDL } from "@lib/fx/bytecode/DebugLayout";
import * as VM from '@lib/fx/bytecode/VM';
import * as Bundle from "@lib/idl/bytecode";
import { EInstructionTypes, ITypeInstruction } from "@lib/idl/IInstruction";
import { IBCDocument } from "@lib/fx/bytecode/Bytecode";

import { TypeLayoutT } from "@lib/idl/bundles/auto/type-layout";
import { TypeFieldT } from "@lib/idl/bundles/auto/type-field";

function asNativeVector<T>(elementDecoder: (u8: Uint8Array) => T, value: Uint8Array, length: number, stride = 4): T[] {
    const vector = [];
    for (let i = 0; i < length; ++i) {
        vector.push(elementDecoder(value.subarray(stride * i, stride * i + stride)));
    }
    return vector;
}

function fromNativeVector<T extends Array<any>>(elementDecoder: (val: T[0]) => Uint8Array, arr: T): Uint8Array {
    let byteLength = arr.reduce((s, val) => s + elementDecoder(val).byteLength, 0);
    let u8Array = new Uint8Array(byteLength);
    let offset = 0;
    for (let val of arr) {
        let u8 = elementDecoder(val);
        u8Array.set(u8, offset);
        offset += u8.byteLength;
    }
    return u8Array;
}

const asInt = u8ArrayAsI32;
const asUint = u8a => (asInt(u8a) >>> 0);
const asFloat = u8ArrayAsF32;
const asBool = u8a => asInt(u8a) !== 0;

const fromInt = i32 => new Uint8Array(i32ToU8Array(i32));
const fromUint = u32 => new Uint8Array(i32ToU8Array(u32));
const fromFloat = f32 => new Uint8Array(i32ToU8Array(f32Asi32(f32)));
const fromBool = b32 => new Uint8Array(i32ToU8Array(+(b32)));

function typeLayoutArrayToBaseType({ fields, length, name, size }: TypeLayoutT): TypeLayoutT
{
    return new TypeLayoutT(fields, undefined, name, size);
}

export function typeAstToTypeLayout(type: ITypeInstruction): TypeLayoutT
{
    const isNotComplexOrSystem = (type: ITypeInstruction) => !type.isComplex() ||
        type.instructionType == EInstructionTypes.k_SystemType;

    let name = type.name;
    let size = type.size;
    let fields: TypeFieldT[] = undefined;
    let length = -1;

    if (type.isNotBaseArray())
    {
        length = type.length;
        
        const elementType = typeAstToTypeLayout(type.arrayElementType);
        fields = elementType.fields;
    }
    else if (!isNotComplexOrSystem(type))
    {
        fields = type.fields.map(({ name, type, semantic }) => new TypeFieldT( typeAstToTypeLayout(type), name, semantic, type.size, type.padding ));
    }

    return new TypeLayoutT( fields, length, <string>name, size );
}

export function fromNativeRaw<T>(data: T, layout: TypeLayoutT): Uint8Array {
    switch (layout.name) {
        case 'bool':
            return fromBool(data);
        case 'int':
            return fromInt(data);
        case 'float':
            return fromFloat(data);
        case 'uint':
            return fromUint(data);
        case 'uint2':
        case 'uint3':
        case 'uint4':
            return fromNativeVector(fromUint, data as any);
        case 'int2':
        case 'int3':
        case 'int4':
            return fromNativeVector(fromInt, data as any);
        case 'float2':
        case 'float3':
        case 'float4':
            return fromNativeVector(fromFloat, data as any);
    }

    // parse as array
    if (layout.length && layout.length >= 0) {
        const elementType = typeLayoutArrayToBaseType(layout);
        return fromNativeVector(val => fromNativeRaw(val, elementType), data as any);
    }

    // parse as structure
    if (layout.fields) {
        let byteLength = layout.fields.reduce((s, field) => {
            const { padding, size, type, name } = field;
            return Math.max(s, padding + size);
        }, 0);
        
        let complex = new Uint8Array(byteLength);
        layout.fields.forEach(field => {
            const { padding, size, type, name } = field;
            const u8 = fromNativeRaw(data[<string>name], type);
            complex.set(u8, padding);
        });
        return complex;
    }

    assert(false, `not implemented`, layout);
    return null;
}

export function asNative(result: Bundle.IMemory, layout: TypeLayoutT)
{
    return asNativeRaw(VM.memoryToU8Array(result), layout);
}

export function asNativeRaw(result: Uint8Array, layout: TypeLayoutT): any {
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
            return asNativeVector(asUint, result, layout.size / 4, 4);
        case 'int2':
        case 'int3':
        case 'int4':
            return asNativeVector(asInt, result, layout.size / 4, 4);
        case 'float2':
        case 'float3':
        case 'float4':
            return asNativeVector(asFloat, result, layout.size / 4, 4);
    }

    // parse as array
    if (layout.length && layout.length >= 0) {
        const elementType = typeLayoutArrayToBaseType(layout);
        return asNativeVector(u8a => asNativeRaw(u8a, elementType), result, layout.length, elementType.size);
    }

    // parse as structure
    if (layout.fields) {
        let complex = {};
        layout.fields.forEach(field => {
            const { padding, size, type } = field;
            complex[<string>field.name] = asNativeRaw(result.subarray(padding, padding + size), type);
        });
        return complex;
    }

    assert(false, `not implemented`, layout);
    return null;
}

export function asNativeViaAST(result: Uint8Array, type: ITypeInstruction): any {
    return asNativeRaw(result, typeAstToTypeLayout(type));
}

export function asNativeViaCDL(result: Uint8Array, cdl: CDL): any {
    return asNativeRaw(result, typeAstToTypeLayout(cdl.info.layout));
}

export function asNativeFunction(bcDocument: IBCDocument): Function
{
    const { code, cdl } = bcDocument.program;
    const bundle = VM.make(`[as-native-function]`, code);
    return (...args: any[]) => {
        assert(!args || args.length === 0, 'arguments not supported');
        return asNativeViaCDL(bundle.play(), cdl);
    };
}