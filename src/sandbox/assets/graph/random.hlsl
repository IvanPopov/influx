#ifndef __RANDOM_HLSL__
#define __RANDOM_HLSL__

#include "externals.hlsl"

float deg2rad(float deg) 
{
    return ((deg) * 3.14f / 180.f);
}

float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

float3 randVUnit (float seed)
{
   float3 v;
   v.x =  random(float2(seed, 0.f)) - 0.5f; 
   v.y =  random(float2(seed, 1.f)) - 0.5f;
   v.z =  random(float2(seed, 2.f)) - 0.5f; 
   return normalize(v);
}

float3 normalComponent (float3 v, float3 norm)
{
   return norm * dot(v, norm);
}

float3 tangentComponent (float3 v, float3 norm)
{
   float3 vNorm = normalComponent(v, norm);
   return v - vNorm;
}

float3 randVTang (in float3 norm, float seed)
{
    float3 randDir = randVUnit(seed);
    return normalize(tangentComponent(randDir, normalize(norm)));
}

/**
 * @node {RndVUnitConus}
 * @title Random unit conus
 * @desc Generates random vectors within <angle> opening.
 */
float3 RndVUnitConus (float3 vBaseNorm, float angle, int partId = 0)
{
    float3   vRand;
    float3   vBaseScale, vTangScale;
    float3   v, vTang;

    v = randVUnit(elapsedTimeLevel);
    vTang = v - vBaseNorm * dot(v, vBaseNorm);

    vTang = normalize(vTang);
    angle = deg2rad(random(float2(elapsedTimeLevel, (float)partId * elapsedTime)) * angle);
    vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
    vRand = normalize(vRand);
    return vRand;
}


/**
 * @node {seed2}
 * @title Seed from id
 * @desc Generate UV-like seed based on id.
 * 
 * For example based on particle id.
 */
float2 seed2(int id) 
{
    return float2((float)(id) * elapsedTimeLevel, (float)(id) * elapsedTime);
}

/**
 * @node {rand3}
 * @title rand3
 * @desc Returns 3-component vector with [0-1] range random values.
 */
float3 rand3(float2 uv) {
   float3 randVec = float3(
      random(uv), 
      random(float2(uv.y, uv.x)), 
      random(float2(uv.x + uv.y, uv.y + 13.149845f))
   );
   return randVec;
}

/**
 * @node {randDir}
 * @title Random Direction
 * @desc Returns random normalized direction.
 */
float3 randDir(float2 uv) {
    return normalize(rand3(uv) * 2.f - float3(1.f));
}

#endif

