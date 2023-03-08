#include <lib.hlsl>

// do not change this layout (!)
struct Vert
{
    float3 pos: POSITION0;
    float3 norm: NORMAL0;
    float2 uv: TEXCOORD0;
}; 
 

TriMesh<Vert> geom<string name = "cube.obj";>;


struct Part {
    float3 pos;
    float3 speed;
    float timelife;
};


void init(out Part part, int partId)
{
    part.pos = float3(0.f, 0.f, 0.f);
    part.timelife = 0.f;
    part.speed = float3(0, 1, 0);
}

void initDirected(out Part part, int partId, float3 pos, float3 speed)
{
    part.pos = pos;
    part.timelife = 0.f;
    part.speed = speed;
}


struct EMITTER 
{
    float time = 0;
};

void spawner(inout EMITTER emitter) {
    uint faceCount;
    uint vertCount;
    geom.GetDimensions(vertCount, faceCount);
    // Vert v = geom.LoadVertex(0u);
    // uint3 face = geom.LoadFace(6u);
    // Vert v0 = geom.LoadVertex(face[03]);
    // uint vertices[6];
    // geom.LoadGSAdjacency(0u, vertices);
    float3 speed = float3(0, 1, 0);

    float rnd = random(float2(elapsedTime, elapsedTimeLevel));
    uint face = uint(rnd * float(faceCount)); 
    uint3 face3 = geom.LoadFace(face);
    Vert v0 = geom.LoadVertex(face3[0]);
    Vert v1 = geom.LoadVertex(face3[1]);
    Vert v2 = geom.LoadVertex(face3[2]);

    float u = random(float2(elapsedTime + 1.f, elapsedTimeLevel * elapsedTime));
    float v = random(float2(elapsedTime + 2.f, elapsedTimeLevel / elapsedTime));

    if(u + v >= 1.f)
    {
        u = 1.f - u;
        v = 1.f - v;
    }

    float s = max(0.f, 1.f - u - v);
    float3 p = v0.pos * u + v1.pos * v + v2.pos * s;

    emitter.time += elapsedTime;
    float dt = 0.05f;
    if (emitter.time > dt) {
        spawn(1) initDirected(p, v0.norm);  
        emitter.time -= dt;
    }
}

 

bool update(inout Part part) {
    part.pos = part.pos + part.speed * elapsedTime * 0.001f; 
    part.timelife = part.timelife + elapsedTime;
    return part.timelife < 30.f;
}


int prerender(in Part part, out LwiInstance input)
{
//     input.pos = part.pos;
//     input.color = float4(0, 1, 0, 1);
//     input.size = 0.1f;
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    input.worldMatr = packLwiRotXToDir(part.pos, part.speed, float3(0.15f));
    return 0;
}

partFx example {
    Capacity = 6000;
    // InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass {
        PrerenderRoutine = compile prerender();
        Geometry = "arrow";
    }
}