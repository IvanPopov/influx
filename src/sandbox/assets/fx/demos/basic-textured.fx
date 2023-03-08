#include <lib.hlsl>

struct Part {
    float3 pos;
    float timelife;
};


int spawner() {
    return 2; 
}


void init(out Part part)
{
    part.pos = float3(0.f, 0.f, 0.f);
    part.timelife = 0.f;
}


bool update(inout Part part) {
    part.pos = part.pos + float3(0, 1, 0) * elapsedTime; 
    part.timelife = part.timelife + elapsedTime;
    return part.timelife < 8.f;
}


struct PartInstance {
    float3 pos   : POSITION;
    float4 color : COLOR;
    float  size  : SIZE;
    float  frame : FRAME;
};


void prerender(in Part part, out PartInstance input)
{
    input.pos = part.pos;
    input.color = float4(1, 1, 1, part.timelife > 1.f ? 1.f : part.timelife);
    input.size = 0.5f; 
    input.frame = part.timelife;
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

// externs from three js
uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

Texture2D albedo<string name = "checker10x10.png";>;
uint frameX<string UIName = "frame X";> = 10u;
uint frameNum<string UIName = "frame Num";> = 100u;

float animSpeed<
  string UIType = "slider";
  float UIMin = 0.001f;
  float UIMax = 10.0f;  
> = 3.f;



struct PixelInputType
{
    float4 position : POSITION;
    float4 color : COLOR;
    float2 uv: TEXCOORD0;
    float frame: TEXCOORD1;
};


struct Geometry {
    float3 position: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};



PixelInputType VS(PartInstance instance, Geometry geometry)
{
    PixelInputType res;

    float3 wnorm;
    wnorm = mul(modelMatrix, float4(geometry.normal, 0.f)).xyz;
     
    // Calculate the position of the vertex against the world, view, and projection matrices.
    float4 offset = float4(geometry.position * instance.size, 0.f);

    res.position = mul(modelMatrix, float4(instance.pos, 1.f) + offset);
    res.position = mul(viewMatrix, res.position); 
    res.position = mul(projectionMatrix, res.position);
    
    res.color = instance.color;
    res.uv = geometry.uv; 
    res.frame = instance.frame;
    
    return res;
}


float4 PS(PixelInputType input) : COLOR 
{
    float time = input.frame * animSpeed;

    SequenceDesc seq;
    seq.frameX = frameX;
    seq.frameLast = frameNum - 1u; 
    seq.frame = time;

    wrap(seq);

    return frameLinear(seq, albedo, input.uv) * input.color;
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

partFx example {
    Capacity = 10;
    InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass {
        PrerenderRoutine = compile prerender();
        VertexShader = compile VS();
        PixelShader = compile PS();
        Geometry = Billboard;
    }

    preset checker10x10 {
        frameX = { 10 };
        frameNum = { 100 };
        albedo = "checker10x10.png";
    }

    preset checker2x2 {
        frameX = { 2 };
        frameNum = { 4 };
        albedo = "checker2x2.png";
    }

    preset seq_fin_expl_d {
        frameX = { 16 };
        frameNum = { 128 };
        albedo = "seq_fin_expl_d.png";
    }

}