import { assert, isNull } from "@lib/common";
import { Scope } from "@lib/fx/analisys/ProgramScope";
import { EScopeType, ITypeInstruction } from "@lib/idl/IInstruction";
import { addSystemFunctions } from "./system/api";
import { addSystemTypeBuiltin } from "./system/builtin";
import { addSystemTypeMatrix } from "./system/matrix";
import { addSystemTypeScalar } from "./system/scalar";
import {
    isBoolBasedType, isFloatBasedType, isHalfBasedType, isIntBasedType, isMatrixType, isScalarType, isUintBasedType,
    isVectorType
} from "./system/utils";
import { addSystemTypeVector } from "./system/vector";
export {
    isBase, isBlendState, isBoolBasedType, isBuffer, isDepthStencilState, isDepthStencilView, isFloatBasedType,
    isFloatType, isHalfBasedType, isIntBasedType, isIntegerType, isMatrixType, isPipelineState, isRasterizerState,
    isRenderTargetView, isSamplerState, isScalarType, isTexture, isUAV, isUintBasedType, isVectorType, resolveRegister
} from './system/utils';

const scope = new Scope({ type: EScopeType.k_System });

addSystemTypeScalar(scope);
addSystemTypeVector(scope);
addSystemTypeMatrix(scope);
addSystemTypeBuiltin(scope);
addSystemFunctions(scope);

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

 export const findType = (typeName: string) => scope.findType(typeName);
 export const findVariable = (varName: string) => scope.findVariable(varName);
 export const findTechnique = (techName: string) => scope.findTechnique(techName);
 export const findFunction = (funcName: string, args?: ITypeInstruction[]) => scope.findFunction(funcName, args);
 
 export const hasType = (typeName: string) => !isNull(scope.findType(typeName));
 export const hasVariable = (varName: string) => !isNull(scope.findVariable(varName));
 export const hasTechnique = (techName: string) => !isNull(scope.findTechnique(techName));

export const SCOPE = scope;

export const T_VOID = scope.findType("void");
export const T_STRING = scope.findType("string");
export const T_NULL = scope.findType("null_t");

export const T_SAMPLER_STATE = scope.findType("SamplerState");
export const T_BLEND_STATE = scope.findType("BlendState");
export const T_DEPTH_STENCIL_STATE = scope.findType("DepthStencilState");

export const T_RENDER_TARGET_VIEW = scope.findType("RenderTargetView");
export const T_DEPTH_STENCIL_VIEW = scope.findType("DepthStencilView");

export const T_FLOAT = scope.findType("float");
export const T_FLOAT2 = scope.findType("float2");
export const T_FLOAT3 = scope.findType("float3");
export const T_FLOAT4 = scope.findType("float4");

export const T_HALF = scope.findType("half");
export const T_HALF2 = scope.findType("half2");
export const T_HALF3 = scope.findType("half3");
export const T_HALF4 = scope.findType("half4");

export const T_FLOAT2X2 = scope.findType("float2x2");
export const T_FLOAT2X3 = scope.findType("float2x3");
export const T_FLOAT2X4 = scope.findType("float2x4");
export const T_FLOAT3X2 = scope.findType("float3x2");
export const T_FLOAT3X3 = scope.findType("float3x3");
export const T_FLOAT3X4 = scope.findType("float3x4");
export const T_FLOAT4X2 = scope.findType("float4x2");
export const T_FLOAT4X3 = scope.findType("float4x3");
export const T_FLOAT4X4 = scope.findType("float4x4");

export const T_BOOL = scope.findType("bool");
export const T_BOOL2 = scope.findType("bool2");
export const T_BOOL3 = scope.findType("bool3");
export const T_BOOL4 = scope.findType("bool4");

export const T_BOOL2X2 = scope.findType("bool2x2");
export const T_BOOL3X3 = scope.findType("bool3x3");
export const T_BOOL4X4 = scope.findType("bool4x4");

export const T_INT = scope.findType("int");
export const T_INT2 = scope.findType("int2");
export const T_INT3 = scope.findType("int3");
export const T_INT4 = scope.findType("int4");

export const T_UINT = scope.findType("uint");
export const T_UINT2 = scope.findType("uint2");
export const T_UINT3 = scope.findType("uint3");
export const T_UINT4 = scope.findType("uint4");

export const T_INT2X2 = scope.findType("int2x2");
export const T_INT3X3 = scope.findType("int3x3");
export const T_INT4X4 = scope.findType("int4x4");

// export const T_SAMPLER = scope.findType("sampler");
// export const T_SAMPLER_2D = scope.findType("sampler2D");
// export const T_SAMPLER_CUBE = scope.findType("samplerCUBE");

export const T_VERTEX_SHADER = scope.findType("VertexShader");
export const T_PIXEL_SHADER = scope.findType("PixelShader");
export const T_COMPUTE_SHADER = scope.findType("ComputeShader");
export const T_GEOMETRY_SHADER = scope.findType("GeometryShader");

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

export function determBaseType(type: ITypeInstruction): ITypeInstruction {
    if (isScalarType(type)) {
        return type;
    }

    if (isVectorType(type) || isMatrixType(type)) {
        if (isFloatBasedType(type)) {
            return T_FLOAT;
        }

        if (isIntBasedType(type)) {
            return T_INT;
        }

        if (isUintBasedType(type)) {
            return T_UINT;
        }

        if (isHalfBasedType(type)) {
            return T_HALF;
        }

        if (isBoolBasedType(type)) {
            return T_BOOL;
        }
    }

    assert(false, `cannot determ base type of ${type.name}`);
    return null;
}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

enum ETypePrecision {
    k_Bool,
    k_Uint,
    k_Int,
    k_Half,
    k_Float,
    k_Unknown = NaN
};

export function determTypePrecision(type: ITypeInstruction): ETypePrecision {
    if (isFloatBasedType(type)) return ETypePrecision.k_Float;
    if (isHalfBasedType(type)) return ETypePrecision.k_Half;
    if (isIntBasedType(type)) return ETypePrecision.k_Int;
    if (isUintBasedType(type)) return ETypePrecision.k_Uint;
    if (isBoolBasedType(type)) return ETypePrecision.k_Bool;
    return ETypePrecision.k_Unknown;
}


export function typePrecisionAsType(precision: ETypePrecision): ITypeInstruction {
    switch (precision) {
        case ETypePrecision.k_Float: return T_FLOAT;
        case ETypePrecision.k_Half: return T_HALF;
        case ETypePrecision.k_Int: return T_INT;
        case ETypePrecision.k_Uint: return T_UINT;
        case ETypePrecision.k_Bool: return T_BOOL;
    }

    return null;
}

/**
 * Determining the most precise type of two types.
 * Type hierarchy: 
 *  float => half => int => uint => bool
 */
export function determMostPreciseBaseType(left: ITypeInstruction, right: ITypeInstruction) {
    assert(isScalarType(left) || isVectorType(left));
    assert(isScalarType(right) || isVectorType(right));

    const type = typePrecisionAsType(Math.max(determTypePrecision(left), determTypePrecision(right)));

    assert(type !== null, 'cannot determ base type');
    return type;
}

