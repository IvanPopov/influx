#include "lib.hlsl"
//#incldue "auxiliary/noise.fx"

uniform uint   instanceTotal: INSTANCE_TOTAL; // number of difference lwi instances

struct Part {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
    uint depth;
    int steps;
    int gen;
    float3 dir;
};


int Spawn()
{
    return 1;
}

void init(out Part part, int partId, int gen = 0, uint depth = 0u, float timelife, float3 pos = float3(0.f, 0.f, 0.f), 
    float3 speed = float3(0.f, 0.7f, 0.f), float3 dir = float3(0.f, 1.f, 0.f))
{
    part.pos = pos;
    part.size = 0.1;
    part.timelife = timelife;
    part.depth = depth;
    part.speed = speed;
    part.steps = 0u;
    part.gen = gen;
    part.dir = dir;
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

    float3 prevPos = part.pos;

    part.timelife = part.timelife + elapsedTime * 0.1f * mult;
    part.pos = part.pos + part.speed * elapsedTime * mult;

    float3 dir = normalize(part.speed);

    if (part.timelife > 1.f / gen * 1.2f) {
        part.speed = float3(0.f, 0.f, 0.f);
        part.depth = 100u;
    }


    float2 seed = float2((float)(partId) * elapsedTimeLevel, (float)(partId) * elapsedTime);

    if (part.timelife > 0.2f) {
        float chance = random(seed);
        if (chance < 0.1f * part.timelife * gen * gen * mult) {
            if (part.depth < 5u) {
                spawn(1) init(part.gen + 1, part.depth + 1u, part.timelife, part.pos, randVTang(part.speed, seed.x) + float3(0.f, 0.4f, 0.f), dir);
                //part.depth = part.depth + 1u;
            }
        }
    }

    int steps = (int)(part.timelife / 0.015f);
    if (steps != part.steps) {
        if (part.depth < 6u) {
            spawn(1) init(part.gen, part.depth + 100u, part.timelife, part.pos, float3(0.f, 0.f, 0.f), dir);
        }
    }
    part.steps = steps;

    //part.speed = randVUnit(random(seed));

    return part.timelife < 1.0f;
}

int prerender(inout Part part, inout DefaultShaderInput input)
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
    return asint(distance(part.pos, cameraPosition));
}

////



void packLwiTransform(in float3 pos, in float3 speed, in float3 size, out float3x4 matr)
{

    // float3 norm = float3(1.f,0.f,0.f) * size.x;
    // float3 tang = float3(0.f,0.f,1.f) * size.y;//crossProduct(norm, float3(0.f,1.f,0.f));
    // float3 binorm = float3(0.f,1.f,0.f) * size.z;//crossProduct(norm, tang);

    float3 norm = normalize(speed);
    float3 tang = normalize(pos - cameraPosition);
    float3 binorm = normalize(cross(norm, tang));

    tang = normalize(cross(norm, binorm));

    norm = -norm * size;
    tang = tang * size;
    binorm = binorm * size;

    matr[0] = float4(norm.x, tang.x, binorm.x, pos.x);
    matr[1] = float4(norm.y, tang.y, binorm.y, pos.y);
    matr[2] = float4(norm.z, tang.z, binorm.z, pos.z);
    
//     matr[0] = float4(norm.x, norm.y, norm.z, pos.x);
//     matr[1] = float4(tang.x, tang.y, tang.z, pos.y);
//     matr[2] = float4(binorm.x, binorm.y, binorm.z, pos.z);
}

int prerenderLwi(inout Part part, inout LwiInstance input)
{
        float am = 1.f;
    if (part.timelife > 0.8f) {
        am = (1.f - part.timelife) / 0.2f;
    }

    float3 dir = part.dir;
    float gen = (float)part.gen + 1.f;
    float3 pos = part.pos.xyz;
    float size = part.size * 2.f / gen * max(0.f, 5.f - part.pos.y);
    // input.color = float4(float3(0.4f, 0.2f, 0.1f), am);
    if (part.gen >= 4 - (int)gen) {
        // input.color = float4(0.f, 0.7f, 0.f, 0.3f);
        size = part.size * 3.f * am;
    }   

    if (part.gen == 0)
    {
        size = 0.f;
    }


    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiTransform(parentPosition + pos, dir, float3(size, size, size), input.worldMatr);

    if (part.gen == 0)
    {
        return asint(3u % instanceTotal);
    }
    return asint((part.gen + 5u) % instanceTotal);
} 

int prerenderLwi2(inout Part part, inout LwiInstance input)
{
        float am = 1.f;
    if (part.timelife > 0.8f) {
        am = (1.f - part.timelife) / 0.2f;
    }

    float gen = (float)part.gen + 1.f;
    float3 pos = part.pos.xyz;
    float size = part.size * 2.f / gen * max(0.f, 5.f - part.pos.y);
    // input.color = float4(float3(0.4f, 0.2f, 0.1f), am);
    if (part.gen >= 4 - (int)gen) {
        // input.color = float4(0.f, 0.7f, 0.f, 0.3f);
        size = part.size * 3.f * am;
    }   

    if (part.gen != 0)
    {
        size = 0.f;
    }

    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiTransform(parentPosition + pos, float3(0.f, 1.f, 0.f), float3(size, size, size), input.worldMatr);

    if (part.gen == 0)
    {
        return asint(3u % instanceTotal);
    }
    return asint((part.gen + 5u) % instanceTotal);
}

////

partFx lwi{
    Capacity = 8000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile initRand();
    UpdateRoutine = compile update();



    pass P0 {
        Sorting = TRUE;
        Geometry = "sfx_leaves";
        PrerenderRoutine = compile prerenderLwi();
    }

    pass P0 {
        Sorting = TRUE;
        Geometry = "sfx_mud_chunks";
        PrerenderRoutine = compile prerenderLwi2();
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



