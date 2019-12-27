import { assert } from "@lib/common";
import { u8ArrayAsF32, u8ArrayAsI32 } from "@lib/fx/bytecode/common";
import { ITypeInstruction } from "@lib/idl/IInstruction";

function asNativeVector(elementDecoder: (u8: Uint8Array) => any, value: Uint8Array, length: number, stride = 4): any[] {
    const vector = [];
    for (let i = 0; i < length; ++i) {
        vector.push(elementDecoder(value.subarray(stride * i, stride * i + stride)));
    }
    return vector;
}

const asInt = u8ArrayAsI32;
const asUint = u8a => (asInt(u8a) >>> 0);
const asFloat = u8ArrayAsF32;
const asBool = u8a => asInt(u8a) !== 0;

export function asNative(result: Uint8Array, layout: ITypeInstruction): any {
    // TODO: remove it?
    while (layout !== layout.baseType) {
        layout = layout.baseType;
    }
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
            return asNativeVector(asUint, result, layout.length, 4);
        case 'int2':
        case 'int3':
        case 'int4':
            return asNativeVector(asInt, result, layout.length, 4);
        case 'float2':
        case 'float3':
        case 'float4':
            return asNativeVector(asFloat, result, layout.length, 4);
    }

    if (layout.isComplex()) {
        let complex = {};
        layout.fields.forEach(field => {
            const { type, type: { padding, size } } = field;
            complex[field.name] = asNative(result.subarray(padding, padding + size), type);
        });
        return complex;
    }

    if (layout.isNotBaseArray()) {
        return asNativeVector(u8a => asNative(u8a, layout.arrayElementType), result, layout.length, layout.arrayElementType.size);
    }

    assert(false, `not implemented: ${layout.toCode()}`);
    return null;
}


