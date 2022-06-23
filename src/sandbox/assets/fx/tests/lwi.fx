
uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;

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

float deg2rad(float deg) 
{
    return ((deg) * 3.14f / 180.f);
}

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

struct Part {
    float3 speed;
    float3 pos : POSITION;
    float size;
    float timelife;
};

// Warning: Do not change layout of this structure!
struct LwiInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};


int Spawn()
{
    return 50;
}

void init(out Part part, int partId)
{
    part.pos = float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    part.pos = part.speed * part.timelife * 3.0f;
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

void packLwiTransform(in float3 pos, in float3 speed, in float size, out float3x4 matr)
{
    matr[0] = float4(size, 0, 0, pos.x);
    matr[1] = float4(0, size, 0, pos.y);
    matr[2] = float4(0, 0, size, pos.z);
}

void prerender(inout Part part, out LwiInstance input)
{
    packLwiTransform(part.pos, part.speed, part.size, input.worldMatr);

    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];
}


partFx project.awesome {
    Capacity = 1000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        Geometry = Sphere;
        PrerenderRoutine = compile prerender();
    }
}


