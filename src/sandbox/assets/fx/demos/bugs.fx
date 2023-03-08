/* created: Wed Jan 11 2023 15:24:51 GMT+0300 (Moscow Standard Time) */

#include <lib.hlsl>

// do not change this layout (!)
struct Vert
{
    float3 pos: POSITION0;
    float3 norm: NORMAL0;
    float2 uv: TEXCOORD0;
}; 
 

TriMesh<Vert> geom<string name = "skull.obj";>;


struct Part {
    uint face; 
    float2 bc;

    float3 dir;

    float timelife;

    bool init;//fixme
    float boost;
};


struct Location
{
    float3 pos;

    float3 norm;
    float3 tang;
    float3 binorm;
    
    float2 uv;

    float3 v[3];
};


void computeTangentAndBinormal(float3 v[3], float2 uv[3], out float3 tangent, out float3 binormal)
{
    float3 dv1 = v[1] - v[0];
    float3 dv2 = v[2] - v[0];

    float2 duv1 = uv[1] - uv[0];
    float2 duv2 = uv[2] - uv[0];

    float r = 1.0f / (duv1.x * duv2.y - duv1.y * duv2.x);
    tangent = (dv1 * duv2.y   - dv2 * duv1.y) * r;
    binormal = (dv2 * duv1.x   - dv1 * duv2.x) * r;
}


void barycentric(float3 a, float3 b, float3 c, float3 p, inout float u, inout float v, inout float s)
{
    float3 v0 = b - a, v1 = c - a, v2 = p - a;
    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    
    float d21 = dot(v2, v1);
    float denom = d00 * d11 - d01 * d01;

    v = (d11 * d20 - d01 * d21) / denom;
    s = (d00 * d21 - d01 * d20) / denom;
    u = 1.0f - v - s;
}


Location location(uint face, float2 bc)
{
    uint3 face3 = geom.LoadFace(face);
    Vert v0 = geom.LoadVertex(face3[0]);
    Vert v1 = geom.LoadVertex(face3[1]);
    Vert v2 = geom.LoadVertex(face3[2]);

    float s = max(0.f, 1.f - bc.x - bc.y);

    Location loc;
    loc.pos = v0.pos * bc.x + v1.pos * bc.y + v2.pos * s;
    loc.norm = v0.norm * bc.x + v1.norm * bc.y + v2.norm * s;
    loc.uv = v0.uv * bc.x + v1.uv * bc.y + v2.uv * s;

    float3 p[3];
    p[0] = v0.pos;
    p[1] = v1.pos;
    p[2] = v2.pos;

    float2 uv[3];
    uv[0] = v0.uv;
    uv[1] = v1.uv;
    uv[2] = v2.uv;
    
    float3 tang, binorm;
    computeTangentAndBinormal(p, uv, tang, binorm);
 
    loc.tang = tang;
    loc.binorm = binorm;

    loc.v[0] = p[0]; 
    loc.v[1] = p[1];
    loc.v[2] = p[2];

    return loc;
}
 
Location location(in Part part)
{
    return location(part.face, part.bc);
}


 

void initRandom(out Part part, int partId, uint face) 
{
    float2 bc;
    bc.x = random(float2(elapsedTime + 1.f, elapsedTimeLevel * elapsedTime)); 
    bc.y = random(float2(elapsedTime + 2.f, elapsedTimeLevel / elapsedTime));

    if(bc.x + bc.y >= 1.f)
    {
        bc.x = 1.f - bc.x;
        bc.y = 1.f - bc.y;
    }

    part.bc = bc;
    part.face = face;

    part.dir = float3(0, 0, 0);
    part.timelife = 0.f;
    part.init = true;
    part.boost = 2.f + (random(bc) * 2.f - 1.f);
}


void initDirected(inout Part part, uint face, float3 pos, float3 dir)
{
    uint3 face3 = geom.LoadFace(face);
    Vert v0 = geom.LoadVertex(face3[0]);
    Vert v1 = geom.LoadVertex(face3[1]);
    Vert v2 = geom.LoadVertex(face3[2]);

    float3 bc;
    barycentric(v0.pos, v1.pos, v2.pos, pos, bc.x, bc.y, bc.z);

    part.bc = min(max(bc.xy, float2(0.f)), float2(1.f));
    part.face = face;
    part.dir = dir;
}


struct EMITTER 
{
    float time = 0.f;
};

float density<
  string UIName = "density";
  string UIType = "slider";
  float UIMin = 0.01f; 
  float UIMax = 100.0f;  
> = 10.0f;

float timelife<
  string UIName = "timelife";
> = 120.0f;

void spawner(inout EMITTER emit) 
{
    if (elapsedTimeLevel - emit.time < 1.f / density) return;
    emit.time = elapsedTimeLevel;

    uint faceCount;
    uint vertCount;
    geom.GetDimensions(vertCount, faceCount);

    float rnd = random(float2(elapsedTime, elapsedTimeLevel));
    uint face = uint(rnd * float(faceCount - 1u)); 
 
    spawn(1) initRandom(face); 
}
 

float boost<
  string UIName = "speed";
  string UIType = "slider";
  float UIMin = 0.001f; 
  float UIMax = 2.00f;  
> = 0.1f;


bool move(inout Part part, uint face, uint3 adj, uint3 adj2, float3 pos, float3 norm)
{
    if (face > 10000u) { 
        return false;
    } 

    float3 dir = part.dir;

    uint vertices[6];
    geom.LoadGSAdjacency(part.face, vertices);

    float k;
    {
        float3 a = geom.LoadVertex(vertices[adj2[0]]).pos;
        float3 b = geom.LoadVertex(vertices[adj2[1]]).pos;
        float3 c = geom.LoadVertex(vertices[adj2[2]]).pos; 

        float3 ca = c - a;
        float3 ba = b - a;

        float3 s = -normalize(ca);
        float3 f = normalize(cross(s, ba));
        float3 e = normalize(cross(f, s));

        k = abs(dot(e, dir));
    }

    float3 a = geom.LoadVertex(vertices[adj[0]]).pos;
    float3 b = geom.LoadVertex(vertices[adj[1]]).pos;
    float3 c = geom.LoadVertex(vertices[adj[2]]).pos;

    float3 ca = c - a;
    float3 ba = b - a;

    float3 s = -normalize(ca);
    float3 f = normalize(cross(s, ba));
    float3 e = normalize(cross(f, s));

    // get back to side
    pos = pos + f * (dot(a - pos, f));
    pos = pos + e * (dot(a - pos, e)); 

    {
        float3 d = k * e + dot(s, dir) * s;
        initDirected(part, face, pos, d);   
    }

    return true;
}

bool update(inout Part part)
{
    Location loc = location(part);

    if (part.init) {
        part.dir = randVTang(loc.norm, elapsedTimeLevel);
        part.init = false;
    }

    part.timelife = part.timelife + elapsedTime;

    float3 posNext = loc.pos + part.dir * elapsedTime * boost * part.boost; 

    float3 bc;
    barycentric(loc.v[0], loc.v[1], loc.v[2], posNext, bc.x, bc.y, bc.z);

    uint faceAdj[3];
    geom.LoadFaceAdjacency(part.face, faceAdj);
    
    bool alive = true;
    if (bc.x > 1.f || bc.x < 0.f) 
    {
        alive = move(part, faceAdj[1], uint3(2u, 3u, 4u), uint3(2u, 0u, 4u), posNext, loc.norm);
    }
    
    else if (bc.y > 1.f || bc.y < 0.f) 
    {
        alive = move(part, faceAdj[2], uint3(4u, 5u, 0u), uint3(4u, 2u, 0u), posNext, loc.norm);
    }

    else if (bc.z > 1.f || bc.z < 0.f) 
    {
        alive = move(part, faceAdj[0], uint3(0u, 1u, 2u), uint3(0u, 4u, 2u), posNext, loc.norm);
    }

    else {
        part.bc = bc.xy;
    }

    
    draw Bug(part);
    draw Normal(part);
    draw Direction(part);

    return part.timelife < timelife;
}


// TODO: allow to pass not a "Part" typed arguemnts !!!
int prerenderBug(in Part part, out LwiColoredInstance input)
{
    Location loc = location(part);
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2]; 

    input.worldMatr = packLwiRotYToDir(loc.pos, part.dir, float3(0.05f));
    input.dynData[0] = float4(0.5f, 0.5f, 0.5f, 1.f);
    return 0;
}


int prerenderNormal(in Part part, out LwiColoredInstance input)
{

    Location loc = location(part);
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    input.worldMatr = packLwiRotXToDir(loc.pos, loc.norm, float3(0.15f, 0.15f, 0.15f) * 0.25f);
    input.dynData[0] = float4(0.f, 2.f, 0, 1.f);
    return 0;
}


int prerenderDirection(in Part part, out LwiColoredInstance input)
{

    Location loc = location(part);
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    input.worldMatr = packLwiRotXToDir(loc.pos, part.dir, float3(0.2f, 0.15f, 0.15f) * 0.25f);
    input.dynData[0] = float4(2.f, 0.f, 0, 1.f);
    return 0;
}



partFx Bugs {
    Capacity = 6000;
    // InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass Bug {
        PrerenderRoutine = compile prerenderBug();
        Geometry = "cylinder";
    }

    pass Normal {
        PrerenderRoutine = compile prerenderNormal();
        Geometry = "arrow";
    }

    pass Direction {
        PrerenderRoutine = compile prerenderDirection();
        Geometry = "arrow";
    }
}