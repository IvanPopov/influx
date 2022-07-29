#ifndef __COMMON_HLSL__
#define __COMMON_HLSL__

/**
 * @node {zeroMatr3x4}
 * @title Zero Matrix 3x4
 * @desc Build zero matrix 3x4.
 */
void zeroMatr3x4(out float3x4 matr)
{
    matr[0] = float4(0);
    matr[1] = float4(0);
    matr[2] = float4(0);
}

#endif

