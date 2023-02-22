import { IScope } from "@lib/idl/IInstruction";
import { getSystemType, generateSystemType } from "./utils";

export function addSystemTypeMatrix(scope: IScope): void {
    let float2 = getSystemType(scope, "float2");
    let float3 = getSystemType(scope, "float3");
    let float4 = getSystemType(scope, "float4");

    let int2 = getSystemType(scope, "int2");
    let int3 = getSystemType(scope, "int3");
    let int4 = getSystemType(scope, "int4");

    let uint2 = getSystemType(scope, "uint2");
    let uint3 = getSystemType(scope, "uint3");
    let uint4 = getSystemType(scope, "uint4");

    let bool2 = getSystemType(scope, "bool2");
    let bool3 = getSystemType(scope, "bool3");
    let bool4 = getSystemType(scope, "bool4");

    generateSystemType(scope, "float2x2", -1, float2, 2);
    generateSystemType(scope, "float2x3", -1, float3, 2);
    generateSystemType(scope, "float2x4", -1, float4, 2);

    generateSystemType(scope, "float3x2", -1, float2, 3);
    generateSystemType(scope, "float3x3", -1, float3, 3);
    generateSystemType(scope, "float3x4", -1, float4, 3);

    generateSystemType(scope, "float4x2", -1, float2, 4);
    generateSystemType(scope, "float4x3", -1, float3, 4);
    generateSystemType(scope, "float4x4", -1, float4, 4);

    generateSystemType(scope, "int2x2", -1, int2, 2);
    generateSystemType(scope, "int2x3", -1, int3, 2);
    generateSystemType(scope, "int2x4", -1, int4, 2);

    generateSystemType(scope, "int3x2", -1, int2, 3);
    generateSystemType(scope, "int3x3", -1, int3, 3);
    generateSystemType(scope, "int3x4", -1, int4, 3);

    generateSystemType(scope, "int4x2", -1, int2, 4);
    generateSystemType(scope, "int4x3", -1, int3, 4);
    generateSystemType(scope, "int4x4", -1, int4, 4);

    generateSystemType(scope, "bool2x2", -1, bool2, 2);
    generateSystemType(scope, "bool2x3", -1, bool3, 2);
    generateSystemType(scope, "bool2x4", -1, bool4, 2);

    generateSystemType(scope, "bool3x2", -1, bool2, 3);
    generateSystemType(scope, "bool3x3", -1, bool3, 3);
    generateSystemType(scope, "bool3x4", -1, bool4, 3);

    generateSystemType(scope, "bool4x2", -1, bool2, 4);
    generateSystemType(scope, "bool4x3", -1, bool3, 4);
    generateSystemType(scope, "bool4x4", -1, bool4, 4);
}

