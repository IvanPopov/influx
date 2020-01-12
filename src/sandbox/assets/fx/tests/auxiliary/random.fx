float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) 
        * 43758.5453123f);
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