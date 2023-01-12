#ifndef __LWI_HLSL__
#define __LWI_HLSL__

#include "externals.hlsl"

// Warning: Do not change layout of this structure!
struct LwiInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};

struct LwiColoredInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};

/**
 * @node {packLwiNaive}
 * @title Lwi Naive
 * @desc Build transform matrix from position, size.
 */
float3x4 packLwiNaive(float3 pos, float3 size)
{
    float3x4 matr;
    matr[0] = float4(size.x, 0, 0, pos.x);
    matr[1] = float4(0, size.y, 0, pos.y);
    matr[2] = float4(0, 0, size.z, pos.z);
    return matr;
}

/**
 * @node {packLwiBillboard}
 * @title Lwi Billboard
 * @desc Build transform matrix from position, dir, size oriented toward camera.
 */
float3x4 packLwiBillboard(float3 pos, float3 dir, float size)
{
    float3 norm = normalize(dir);
    float3 tang = normalize(pos - cameraPosition);
    float3 binorm = normalize(cross(norm, tang));

    tang = normalize(cross(norm, binorm));

    norm = -norm * size;
    tang = tang * size;
    binorm = binorm * size;

    float3x4 matr;
    matr[0] = float4(norm.x, tang.x, binorm.x, pos.x);
    matr[1] = float4(norm.y, tang.y, binorm.y, pos.y);
    matr[2] = float4(norm.z, tang.z, binorm.z, pos.z);
    return matr;
}


/**
 * @node {packLwiRotXToDir}
 * @title Lwi RotXToDir
 * @desc Build transform matrix from position, dir, size oriented as X axis toward dir.
 */
float3x4 packLwiRotXToDir(float3 pos, float3 dir, float3 size)
{
    float3 norm = normalize(dir);
    float3 tang;
    if (abs(abs(norm.y) - 1.f) < 0.001f) {
        tang = normalize(cross(norm, float3(1.f, 0.f, 0.f)));
    } else {
        tang = normalize(cross(norm, float3(0.f, 1.f, 0.f)));
    }
    float3 binorm = normalize(cross(norm, tang));

    norm = norm * size.x;
    tang = tang * size.y;
    binorm = binorm * size.z;

    float3x4 matr;
    matr[0] = float4(norm.x, binorm.x, tang.x, pos.x);
    matr[1] = float4(norm.y, binorm.y, tang.y, pos.y);
    matr[2] = float4(norm.z, binorm.z, tang.z, pos.z);
    return matr;
}


/**
 * @node {packLwiRotXToDir}
 * @title Lwi RotXToDir
 * @desc Build transform matrix from position, dir, size oriented as X axis toward dir.
 */
float3x4 packLwiRotYToDir(float3 pos, float3 dir, float3 size)
{
    float3 norm = normalize(dir);
    float3 tang;
    if (abs(abs(norm.y) - 1.f) < 0.001f) {
        tang = normalize(cross(norm, float3(1.f, 0.f, 0.f)));
    } else {
        tang = normalize(cross(norm, float3(0.f, 1.f, 0.f)));
    }
    float3 binorm = normalize(cross(norm, tang));

    // IP: There are some errors here possibly (!)
    norm = norm * size.x;
    tang = tang * size.y;
    binorm = binorm * size.z;

    float3x4 matr;
    matr[0] = float4(tang.x, norm.x, binorm.x, pos.x);
    matr[1] = float4(tang.y, norm.y, binorm.y, pos.y);
    matr[2] = float4(tang.z, norm.z, binorm.z, pos.z);
    return matr;
}


/**
 * @node {packLwiRotZToDir}
 * @title Lwi RotZToDir
 * @desc Build transform matrix from position, dir, size oriented as Z axis toward dir.
 */
float3x4 packLwiRotZToDir(float3 pos, float3 dir, float3 size)
{
    float3 norm = normalize(dir);
    float3 tang;
    if (abs(norm.y - 1.f) < 0.001f) {
        tang = normalize(cross(norm, float3(1.f, 0.f, 0.f)));
    } else {
        tang = normalize(cross(norm, float3(0.f, 1.f, 0.f)));
    }
    float3 binorm = normalize(cross(norm, tang));

    norm = norm * size.x;
    tang = tang * size.y;
    binorm = -binorm * size.z;

    float3x4 matr;
    matr[0] = float4(tang.x, binorm.x, norm.x, pos.x);
    matr[1] = float4(tang.y, binorm.y, norm.y, pos.y);
    matr[2] = float4(tang.z, binorm.z, norm.z, pos.z);
    return matr;
}


#endif
