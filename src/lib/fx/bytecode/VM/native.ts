import { assert } from "@lib/common";
import { u8ArrayAsF32, u8ArrayAsI32 } from "@lib/fx/bytecode/common";
import { CDL } from "@lib/fx/bytecode/DebugLayout";
import { EInstructionTypes, IFunctionDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import * as Bytecode from '@lib/fx/bytecode';
import * as VM from '@lib/fx/bytecode/VM';
import * as Bundle from "@lib/idl/bytecode";
import { TypeLayoutT, TypeFieldT } from "@lib/idl/bundles/FxBundle_generated";

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

export function asNativeFunction(fn: IFunctionDeclInstruction): Function
{
    const { code, cdl } = Bytecode.translate(fn);
    const bundle = VM.make(`[as-native-function]`, code);
    return (...args: any[]) => {
        assert(!args || args.length === 0, 'arguments not supported');
        return asNativeViaCDL(bundle.play(), cdl);
    };
}