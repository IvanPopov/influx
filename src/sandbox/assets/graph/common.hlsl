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


/**
 * @node {range01To11}
 * @title range (0, 1) => (-1, 1)
 * @desc range (0, 1) => (-1, 1)
 */
float range01To11(float x)
{
    return x * 2.f - 1.f;
}

float3 range01To11(float3 x)
{
    return x * 2.f - 1.f;
}


#endif

