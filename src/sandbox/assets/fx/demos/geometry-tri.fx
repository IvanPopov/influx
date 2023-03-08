/* created: Tue Jan 10 2023 21:36:40 GMT+0300 (Moscow Standard Time) */

#include <lib.hlsl>

// do not change this layout (!)
struct Vert
{
    float3 pos: POSITION0;
    float3 norm: NORMAL0;
    float2 uv: TEXCOORD0;
}; 
 

TriMesh<Vert> geom<string ResourceName = "skull.obj";>;
Texture2D albedo<string ResourceName = "skull.jpg";>; 
// Texture2D albedo

struct Part {
    float3 v1;
    float3 v2;
    float3 v3;
    float2 uv1;
    float2 uv2;
    float2 uv3;
    float3 norm;
    float timelife;
    float3 pos;
    float3 dir;
    float4 color;
};



void initFace(out Part part, int partId: PART_ID, uint spawnId: SPAWN_ID, uint face)
{
    uint3 face3 = geom.LoadFace(face + spawnId);
    Vert v1 = geom.LoadVertex(face3[0]);
    Vert v2 = geom.LoadVertex(face3[1]);
    Vert v3 = geom.LoadVertex(face3[2]);

    part.v1 = v1.pos;
    part.v2 = v2.pos;
    part.v3 = v3.pos;
    part.uv1 = v1.uv;
    part.uv2 = v2.uv;
    part.uv3 = v3.uv;
    part.timelife = 0.f;
    float3 n = -normalize(cross(v3.pos - v2.pos, v3.pos - v1.pos));

    part.pos = float3(0, 0, 0);
    part.dir = normalize(RndVUnitConus(n, 45.f / 180.f * 3.14f, partId));
    part.norm = n;

    part.color = float4(1,1,1,1);
}


void spawner() {
    uint faceCount;
    uint vertCount;
    geom.GetDimensions(vertCount, faceCount);

    if (frameNumber == 0u) {
        spawn(faceCount) initFace(0u);
    }
}
 

float destruct<
  string UIName = "destruct";
  string UIType = "slider";
  float UIMin = 0.f;
  float UIMax = 1.0f;  
> = 0.f;

 
 
bool update(inout Part part) {
    part.timelife = part.timelife + elapsedTime;

    float delay = 2.f;

    if (part.v1.y < destruct * 2.f) {
        
        float t = destruct * 2.f - part.v1.y;
        part.pos = (10.f * part.dir * t + float3(0.f, -9.81f, 0.f) * t * t * 0.5f) / 10.f;
        part.color = float4(1, 1, 1, 1) * max(0.f, 1.f - 1.25 * destruct);
    } else {
        part.pos = float3(0,0,0);
        part.color = float4(1,1,1,1);
    }

    return part.timelife < 1000.f; 
}


////////

// struct TriVertex 
// {
//     float3 pos: POSITION0;
//     float4 color: COLOR0;
// };

// struct TriInstance
// {
//     TriVertex v[3] : VERTICES;
// };


struct TriInstance
{
    float3 v1 : VERTEX1;
    float3 v2 : VERTEX2;
    float3 v3 : VERTEX3;
    float2 uv1: TEXCOORD1;
    float2 uv2: TEXCOORD2;
    float2 uv3: TEXCOORD3;
    float3 norm : NORMAL;

    float3 pos: CENTER;
    float4 color : COLOR0;
};


int prerenderTriangles(in Part part, out TriInstance tri)
{
    tri.v1 = part.v1;
    tri.v2 = part.v2;
    tri.v3 = part.v3;
    tri.uv1 = part.uv1;
    tri.uv2 = part.uv2;
    tri.uv3 = part.uv3;
    tri.norm = part.norm;
    tri.pos = part.pos;
    tri.color = part.color;
    // FIXME: invalid layout for camera postion (!) in autogen globals buffers (!)
    return asint(distance(part.v1, cameraPosition));
}

struct VSOut
{
    float4 pos : POSITION;
    float4 color : COLOR0;
    float2 uv : TEXCOORD0;
};

struct Geometry {
    float3 position: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};


uniform float4x4 modelMatrix: MODEL_MATRIX;
uniform float4x4 viewMatrix: VIEW_MATRIX;
uniform float4x4 projectionMatrix: PROJECTION_MATRIX;


VSOut VSTriangles(TriInstance inst, Geometry geom, uint vertexID: SV_VertexID)
{
    VSOut res;
    res.pos = float4(geom.position, 1);

    if (vertexID == 0u) {
         res.pos = float4(inst.v1, 1);
         res.uv = inst.uv1;
    } 

    if (vertexID == 1u) {
         res.pos = float4(inst.v2, 1);
         res.uv = inst.uv2;
    } 

    if (vertexID == 2u) {
         res.pos = float4(inst.v3, 1);
         res.uv = inst.uv3;
    } 

    res.pos.xyz = res.pos.xyz + inst.pos;

    res.pos = mul(viewMatrix, res.pos);
    res.pos = mul(projectionMatrix, res.pos);

    res.color = float4(inst.norm * 0.5f + 0.5f, 01.f);

    float3 lightDir;
    lightDir = normalize(float3(1.0, 4.0, 1.0));

    float NdL;
    NdL = max(0.f, dot(inst.norm, lightDir) * 0.75f);
    res.color = float4(float3(NdL), 0.0) + float4(0.25, 0.25, 0.25, 1.0);
    res.color *= inst.color;

    return res;
}

SamplerState sampLinear;

float4 PSTriangle(VSOut input): COLOR 
{
    return albedo.Sample(sampLinear, input.uv) * input.color;
}

////////


partFx triangles {
    Capacity = 8192; 
    // InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass {
        ZEnable = true;
        BlendEnable = true;
        
        PrerenderRoutine = compile prerenderTriangles();
        VertexShader = compile VSTriangles();
        PixelShader = compile PSTriangle();
        Geometry = "triangle";
        Sorting = True;
    }
}

