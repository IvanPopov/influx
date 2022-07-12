// Warning: Do not change layout of this structure!
struct LwiInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};

/**
 * @node {packLwiTransform}
 * @title Pack lwi-like transform matrix
 * @desc Build transform matrix from position, speed and size.
 */
void packLwiTransform(in float3 pos, in float3 speed, in float3 size, out float3x4 matr)
{
    matr[0] = float4(size.x, 0, 0, pos.x);
    matr[1] = float4(0, size.y, 0, pos.y);
    matr[2] = float4(0, 0, size.z, pos.z);
}
