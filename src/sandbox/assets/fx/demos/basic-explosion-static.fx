#include <lib.hlsl>

struct Part 
{
    float3 pos;
    float timelife;
};


void init(out Part part)
{
    part.pos = float3(0.f, 0.f, 0.f);
    part.timelife = 0.f;
}


void spawner() {
    if (frameNumber == 0u) {
        spawn(1) init(); 
    }
}



bool update(inout Part part) {
    part.pos = part.pos; 
    part.timelife += elapsedTime; 
    return true;
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
    input.size = 2.5f; 
    input.frame = part.timelife;
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

// externs from three js
uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

Texture2D albedo<string name = "seq_fin_expl_d.png";>; 
uint frameX<string UIName = "Frame X";> = 16u;
uint frameNum<string UIName = "Frame Num";> = 128u;


float animSpeed<
  string UIName = "Speed";
  string UIType = "slider";
  float UIMin = 0.001f;
  float UIMax = 100.0f;  
> = 64.f;

float intensity<
  string UIName = "Intensity";
> = 1.1f; 

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
     
    float4 offset = float4(geometry.position * instance.size, 0.f);

    res.position = mul(modelMatrix, float4(instance.pos, 1.f));
    res.position = mul(viewMatrix, res.position) + offset; 
    res.position = mul(projectionMatrix, res.position);
    
    res.color = instance.color * intensity;
    res.uv = geometry.uv; 
    res.frame = instance.frame;
    
    return res;
}


float4 PS(PixelInputType input) : COLOR 
{
    float time = input.frame * animSpeed;

    SequenceDesc explosion;
    explosion.frameX = frameX;
    explosion.frameLast = frameNum - 1u; 
    explosion.frame = time;

    // make a loop
    wrap(explosion);
    return frameLinear(explosion, albedo, input.uv) * input.color; 
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
        animSpeed = { 16 };
        albedo = "checker10x10.png";
    }

    preset checker2x2 {
        frameX = { 2 };
        frameNum = { 4 };
        animSpeed = { 1 };
        albedo = "checker2x2.png";
    }

    preset seq_fin_expl_d {
        frameX = { 16 };
        frameNum = { 128 };
        animSpeed = { 64 };
        albedo = "seq_fin_expl_d.png";
    }

}