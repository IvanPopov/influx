
#include <lib.hlsl>


// instanceTotal avaialable in prerender pass for known TPL
uniform uint   instanceTotal: INSTANCE_TOTAL; // number of difference lwi instances

float3 randUnitCircle(uint partId) 
{
    float2 seed = float2(elapsedTimeLevel, (float)partId * elapsedTime);
    float alpha = random(seed) * 3.14f * 2.f;
    float dist = random(seed * 2.f);
    return float3(sin(alpha), 0.f, cos(alpha)) * dist;
}


struct Part {
    float3 speed;
    float3 pos : POSITION;
    float3 size;
    float timelife;
    uint templateIndex;
};

/////////////////////////////////////////////////////////////////////
// Spawn Routine
/////////////////////////////////////////////////////////////////////
int Spawn()
{
    return 256;
}

float3 sizeFromPos(float3 pos) {
    return float3(1.f, noise(pos.xz * 1.3f + float2(elapsedTimeLevel * 1.f, 0.f)) / 0.06f, 1.f) * 0.03f;
}

/////////////////////////////////////////////////////////////////////
// Init Routine
/////////////////////////////////////////////////////////////////////
void Init(inout Part part, uint partId)
{
    
    part.pos = parentPosition + randUnitCircle(partId);
    //float h = random(float2(elapsedTime, (float)partId)) * 20.f;
    part.size = sizeFromPos(part.pos);
    part.timelife = 0.0;
    part.speed = float3(0.f);
    part.templateIndex = partId;
}

/////////////////////////////////////////////////////////////////////
// Update Routine
/////////////////////////////////////////////////////////////////////
bool Update(inout Part part)
{
    //part.pos = part.pos + part.speed * elapsedTime;
    part.size = sizeFromPos(part.pos) * 2.f;
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

void packLwiTransform(in float3 pos, in float3 speed, in float3 size, out float3x4 matr)
{
    matr[0] = float4(size.x, 0, 0, pos.x);
    matr[1] = float4(0, size.y, 0, pos.y);
    matr[2] = float4(0, 0, size.z, pos.z);
}

int prerender(inout Part part, inout LwiInstance input)
{
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiTransform(part.pos, part.speed, part.size, input.worldMatr);
    return asint(part.templateIndex % instanceTotal);//asint(distance(part.pos, cameraPosition));
}

partFx project.awesome {
    Capacity = 4096;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile Init();
    UpdateRoutine = compile Update();

    pass P0 {
        Sorting = TRUE; 
        Geometry = "sfx_leaves";
        PrerenderRoutine = compile prerender();
    }
}


