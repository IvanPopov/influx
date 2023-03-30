import { IScope } from "@lib/idl/IInstruction";
import { generateSystemFunction, TEMPLATE_TYPE, USAGE_CONTROL_FLOW, USAGE_PS } from "./utils";


// TODO: rework system function templates for better readability
export function addSystemFunctions(scope: IScope): void {
    // todo: rework setup of system functions according with microsoft docs.
    generateSystemFunction(scope, "dot", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    // https://docs.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul
    // TODO: add support for int|uint|bool based vectors 
    generateSystemFunction(scope, "mul", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "int"]);
    generateSystemFunction(scope, "mul", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4", "float2x2", "float3x3", "float4x4"]);
    generateSystemFunction(scope, "mul", TEMPLATE_TYPE, ["float", TEMPLATE_TYPE], ["float2", "float3", "float4", "float2x2", "float3x3", "float4x4"]);
    generateSystemFunction(scope, "mul", "float4", ["float4", TEMPLATE_TYPE], ["float4x4", "float4x3", "float4x2"]);
    generateSystemFunction(scope, "mul", "float3", ["float3", TEMPLATE_TYPE], ["float3x4", "float3x3", "float3x2"]);
    generateSystemFunction(scope, "mul", "float2", ["float2", TEMPLATE_TYPE], ["float2x4", "float2x3", "float2x2"]);
    generateSystemFunction(scope, "mul", "float4", [TEMPLATE_TYPE, "float4"], ["float4x4", "float3x4", "float2x4"]);
    generateSystemFunction(scope, "mul", "float3", [TEMPLATE_TYPE, "float3"], ["float4x3", "float3x3", "float2x3"]);
    generateSystemFunction(scope, "mul", "float2", [TEMPLATE_TYPE, "float2"], ["float4x2", "float3x2", "float2x2"]);

    /**
     * scalar = int|uint|float
     * vector = vector<int|uint|float, n>, n = 2,3,4
     * matrix = matrix<scalar, rows, columns>, r = 2,3,4, c = 2,3,4
     * 
     * scalar mul(scalar, scalar)
     * vector mul(scalar, vector)
     * vector mul(vector, scalar)
     * vector mul(vector, vector)
     * matrix mul(scalar, matrix)
     * matrix mul(matrix, scalar)
     * vector mul(vector, matrix)
     * vector mul(matrix, vector)
     * matrix mul(matrix, matrix)
     */

    generateSystemFunction(scope, "mod", "float", ["float", "float"], null);
    generateSystemFunction(scope, "floor", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "round", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "ceil", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction(scope, "fract", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "abs", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "abs", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    generateSystemFunction(scope, "sign", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "sign", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    generateSystemFunction(scope, "normalize", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "length", "float", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "cross", "float3", ["float3", "float3"], null);
    generateSystemFunction(scope, "reflect", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    
    generateSystemFunction(scope, "max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    generateSystemFunction(scope, "max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint", "uint2", "uint3", "uint4"]);

    generateSystemFunction(scope, "min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    generateSystemFunction(scope, "min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint", "uint2", "uint3", "uint4"]);

    generateSystemFunction(scope, "fmod", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "ldexp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "reversebits", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["uint"]);
    

    generateSystemFunction(scope, "clamp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "clamp", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float", "float"], ["float2", "float3", "float4"]);

    generateSystemFunction(scope, "pow", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "pow", TEMPLATE_TYPE, [TEMPLATE_TYPE,TEMPLATE_TYPE], ["float2", "float3", "float4"]);
    generateSystemFunction(scope, "mod", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "float3", "float4"]);
    generateSystemFunction(scope, "mod", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);
    generateSystemFunction(scope, "exp", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "exp2", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "log", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "log2", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "inversesqrt", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "sqrt", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    // generateSystemFunction(scope, "all", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    // generateSystemFunction(scope, "any", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    /** @deprecated (SM4) */
    generateSystemFunction(scope, "not", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction(scope, "distance", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction(scope, "lessThan", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "lessThan", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "lessThan", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction(scope, "lessThanEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "lessThanEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "lessThanEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction(scope, "equal", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "equal", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "equal", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);
    generateSystemFunction(scope, "equal", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction(scope, "notEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "notEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "notEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);
    generateSystemFunction(scope, "notEqual", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction(scope, "greaterThan", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "greaterThan", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "greaterThan", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction(scope, "greaterThanEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction(scope, "greaterThanEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction(scope, "greaterThanEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction(scope, "radians", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "degrees", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "sin", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "cos", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "sincos", "void", [TEMPLATE_TYPE, `out ${TEMPLATE_TYPE}`, `out ${TEMPLATE_TYPE}`], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "tan", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "asin", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "acos", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "atan", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "atan", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "atan2", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "atan2", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction(scope, "tex2D", "float4", ["sampler", "float2"], null);
    // generateSystemFunction(scope, "tex2D", "float4", ["sampler2D", "float2"], null);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler", "float3"], null);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler2D", "float3"], null);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler", "float4"], null);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler2D", "float4"], null);
    // generateSystemFunction(scope, "texCUBE", "float4", ["sampler", "float3"], null);
    // generateSystemFunction(scope, "texCUBE", "float4", ["samplerCUBE", "float3"], null);

    // generateSystemFunction(scope, "tex2D", "float4", ["sampler", "float2", "float"], null, false, true);
    // generateSystemFunction(scope, "tex2D", "float4", ["sampler2D", "float2", "float"], null, false, true);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler", "float3", "float"], null, false, true);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler2D", "float3", "float"], null, false, true);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler", "float4", "float"], null, false, true);
    // generateSystemFunction(scope, "tex2DProj", "float4", ["sampler2D", "float4", "float"], null, false, true);
    // generateSystemFunction(scope, "texCUBE", "float4", ["sampler", "float3", "float"], null, false, true);
    // generateSystemFunction(scope, "texCUBE", "float4", ["samplerCUBE", "float3", "float"], null, false, true);

    // generateSystemFunction(scope, "tex2DLod", "float4", ["sampler", "float2", "float"], null, true, false);
    // generateSystemFunction(scope, "tex2DLod", "float4", ["sampler2D", "float2", "float"], null, true, false);
    // generateSystemFunction(scope, "tex2DProjLod", "float4", ["sampler", "float3", "float"], null, true, false);
    // generateSystemFunction(scope, "tex2DProjLod", "float4", ["sampler2D", "float3", "float"], null, true, false);
    // generateSystemFunction(scope, "tex2DProjLod", "float4", ["sampler", "float4", "float"], null, true, false);
    // generateSystemFunction(scope, "tex2DProjLod", "float4", ["sampler2D", "float4", "float"], null, true, false);
    // generateSystemFunction(scope, "texCUBELod", "float4", ["sampler", "float3", "float"], null, true, false);
    // generateSystemFunction(scope, "texCUBELod", "float4", ["samplerCUBE", "float3", "float"], null, true, false);

    //OES_standard_derivatives

    generateSystemFunction(scope, "dFdx", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "dFdy", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "width", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "fwidth", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction(scope, "smoothstep", "float3", ["float3", "float3", "float3"], null);

    generateSystemFunction(scope, "smoothstep", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "smoothstep", TEMPLATE_TYPE, ["float", "float", TEMPLATE_TYPE], ["float2", "float3", "float4"]);

    generateSystemFunction(scope, "step", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "clip", "void", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"], USAGE_PS);

    generateSystemFunction(scope, "frac", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "lerp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction(scope, "lerp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction(scope, "saturate", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction(scope, "asfloat", "float", [TEMPLATE_TYPE], ["float", "int", "bool", "uint"]);
    generateSystemFunction(scope, "asfloat", "float2", [TEMPLATE_TYPE], ["float2", "int2", "bool2", "uint2"]);
    generateSystemFunction(scope, "asfloat", "float3", [TEMPLATE_TYPE], ["float3", "int3", "bool3", "uint3"]);
    generateSystemFunction(scope, "asfloat", "float4", [TEMPLATE_TYPE], ["float4", "int4", "bool4", "uint4"]);

    generateSystemFunction(scope, "asint", "int", [TEMPLATE_TYPE], ["float", "int", "bool", "uint"]);
    generateSystemFunction(scope, "asint", "int2", [TEMPLATE_TYPE], ["float2", "int2", "bool2", "uint2"]);
    generateSystemFunction(scope, "asint", "int3", [TEMPLATE_TYPE], ["float3", "int3", "bool3", "uint3"]);
    generateSystemFunction(scope, "asint", "int4", [TEMPLATE_TYPE], ["float4", "int4", "bool4", "uint4"]);

    generateSystemFunction(scope, "asuint", "uint", [TEMPLATE_TYPE], ["float", "int", "bool", "uint"]);
    generateSystemFunction(scope, "asuint", "uint2", [TEMPLATE_TYPE], ["float2", "int2", "bool2", "uint2"]);
    generateSystemFunction(scope, "asuint", "uint3", [TEMPLATE_TYPE], ["float3", "int3", "bool3", "uint3"]);
    generateSystemFunction(scope, "asuint", "uint4", [TEMPLATE_TYPE], ["float4", "int4", "bool4", "uint4"]);

    generateSystemFunction(scope, "InterlockedAdd", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["int"]);
    // generateSystemFunction(scope, "InterlockedAdd", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint"]);

    generateSystemFunction(scope, "f16tof32", "float", ["uint"], null);
    generateSystemFunction(scope, "f32tof16", "uint", ["float"], null);

    generateSystemFunction(scope, "any", "bool", [TEMPLATE_TYPE], ["int", "uint", "float", "bool"]);
    generateSystemFunction(scope, "any", "bool", [TEMPLATE_TYPE], ["int2", "uint2", "float2", "bool2", "float2x2"]);
    generateSystemFunction(scope, "any", "bool", [TEMPLATE_TYPE], ["int3", "uint3", "float3", "bool3", "float3x3"]);
    generateSystemFunction(scope, "any", "bool", [TEMPLATE_TYPE], ["int4", "uint4", "float4", "bool4", "float4x4"]);

    generateSystemFunction(scope, "all", "bool", [TEMPLATE_TYPE], ["int", "uint", "float", "bool"]);
    generateSystemFunction(scope, "all", "bool", [TEMPLATE_TYPE], ["int2", "uint2", "float2", "bool2", "float2x2"]);
    generateSystemFunction(scope, "all", "bool", [TEMPLATE_TYPE], ["int3", "uint3", "float3", "bool3", "float3x3"]);
    generateSystemFunction(scope, "all", "bool", [TEMPLATE_TYPE], ["int4", "uint4", "float4", "bool4", "float4x4"]);

    // DX12

    generateSystemFunction(scope, "WaveGetLaneIndex", "uint", [], ["void"]);
    generateSystemFunction(scope, "WaveActiveBallot", "uint4", [TEMPLATE_TYPE], ["bool"]);

    // control flow
    generateSystemFunction(scope, "SetVertexShader", "void", [TEMPLATE_TYPE], ["VertexShader"], USAGE_CONTROL_FLOW);
    generateSystemFunction(scope, "SetPixelShader", "void", [TEMPLATE_TYPE], ["PixelShader"], USAGE_CONTROL_FLOW);
    generateSystemFunction(scope, "SetGeometryShader", "void", [TEMPLATE_TYPE], ["GeometryShader"], USAGE_CONTROL_FLOW);
    generateSystemFunction(scope, "SetDepthStencilState", "void", [TEMPLATE_TYPE, "int"], ["DepthStencilState"], USAGE_CONTROL_FLOW);
    generateSystemFunction(scope, "SetBlendState", "void", [TEMPLATE_TYPE], ["BlendState"], USAGE_CONTROL_FLOW);                        // todo: use correct arguments
    generateSystemFunction(scope, "SetRasterizerState", "void", [TEMPLATE_TYPE], ["RasterizerState"], USAGE_CONTROL_FLOW);              // todo: use correct arguments

    generateSystemFunction(scope, "SetRenderTargets", "void", ["RenderTargetView", "DepthStencilView"], null, USAGE_CONTROL_FLOW);
}
