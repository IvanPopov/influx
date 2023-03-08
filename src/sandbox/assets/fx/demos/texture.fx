#include <lib.hlsl>

Texture2D tex<string name = "saber-logo.png";>;

struct Part {
    float3 pos;
    float timelife;
    float4 color;
    float3 speed;
};

uint2 texDimtoUV(uint2 dim, uint i) {
    return uint2(i % dim.x, i / dim.x);
}

void init(out Part part, uint spawnId)
{
    uint w, h;
    tex.GetDimensions(0u, w, h);
    uint2 uv = texDimtoUV(uint2(w, h), spawnId);

    float aspect = float(w) / float(h);
    part.pos = (float3(uv.x, h - uv.y, 0.f) / float3(w, float(h) * aspect, 1) - float3(0.5f, 0.5f / aspect, 0.f)) * 4.5f;
    part.timelife = 0.f;
    float4 color = tex.Load(int3(uv.x, uv.y, 0));
    part.color = color;
    part.color.a = color.a == 0.0f ? 0.5f : color.a;
    part.speed = randDir(float2(spawnId, 0));
}


void spawner() {
    if (frameNumber == 0) {
        uint w, h;
        tex.GetDimensions(0u, w, h);  
        spawn(w * h) init(); 
    }
}


bool update(inout Part part, int partId) {
    
    part.pos += lerp(float3(0, 0, 0), part.speed, elapsedTimeLevel > 2.f ? 1.0 : 0.f) * 10.f * elapsedTime; 
    part.timelife = part.timelife + elapsedTime;
    part.color.a -= sqrt(dot(part.pos, part.pos)) / 700.f;
    return part.timelife < 4.f;
}


void prerender(in Part part, out DefaultShaderInput input)
{
    input.pos = part.pos;
    input.color = part.color;
    input.size = 0.1f;
}

partFx example {
    Capacity = 16384;
    InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass {
        PrerenderRoutine = compile prerender();
        Geometry = "Box";
    }
}