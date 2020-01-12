#include "auxiliary/random.fx"

uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;


struct Part {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
    uint depth;
    int steps;
    int gen;
};

/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};

int Spawn()
{
    return 1;
}

void init(out Part part, int partId, int gen = 0, uint depth = 0u, float timelife, float3 pos = float3(0.f, 0.f, 0.f), float3 speed = float3(0.f, 0.7f, 0.f))
{
    part.pos = pos;
    part.size = 0.1;
    part.timelife = timelife;
    part.depth = depth;
    part.speed = speed;
    part.steps = 0u;
    part.gen = gen;
}


void initRand(out Part part, int partId)
{
    float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);
    init(part, partId, 0, 0u, 0.f, float3(random(seed.xy), 0.f, random(seed.yx)) * float3(8.f) - float3(4.f, 0.f, 4.f));
}
  
bool update(inout Part part, int partId)
{
    float gen = (float)part.gen + 1.f;
    float mult = 8.f;

    part.timelife = part.timelife + elapsedTime * 0.1f * mult;
    part.pos = part.pos + part.speed * elapsedTime * mult;

    if (part.timelife > 1.f / gen * 1.2f) {
        part.speed = float3(0.f, 0.f, 0.f);
        part.depth = 100u;
    }


    float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);

    if (part.timelife > 0.2f) {
        float chance = random(seed);
        if (chance < 0.1f * part.timelife * gen * gen * mult) {
            if (part.depth < 5u) {
                spawn(1) init(part.gen + 1, part.depth + 1u, part.timelife, part.pos, randVTang(part.speed, seed.x) + float3(0.f, 0.4f, 0.f));
                //part.depth = part.depth + 1u;
            }
        }
    }

    int steps = (int)(part.timelife / 0.015f);
    if (steps != part.steps) {
        if (part.depth < 6u) {
            spawn(1) init(part.gen, part.depth + 100u, part.timelife, part.pos, float3(0.f, 0.f, 0.f));
        }
    }
    part.steps = steps;

    //part.speed = randVUnit(random(seed));

    return part.timelife < 1.0f;
}

void prerender(inout Part part, out DefaultShaderInput input)
{
    float am = 1.f;
    if (part.timelife > 0.8f) {
        am = (1.f - part.timelife) / 0.2f;
    }

    float gen = (float)part.gen + 1.f;
    input.pos.xyz = part.pos.xyz;
    input.size = part.size * 2.f / gen * max(0.f, 5.f - part.pos.y);
    input.color = float4(float3(0.4f, 0.2f, 0.1f), am);
    if (part.gen >= 4 - (int)gen) {
        input.color = float4(0.f, 0.7f, 0.f, 0.3f);
        input.size = part.size * 3.f * am;
    }   
}

partFx project.awesome {
    Capacity = 8000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile initRand();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        Geometry = sphere;
        PrerenderRoutine = compile prerender();
    }
}


