#include <lib.hlsl>

struct Part {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
    bool child;
    int templateIndex;
};


int SpawnRegular()
{
    return 5;
}



void init(out Part part, int partId)
{
    part.pos = parentPosition + float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1; 
    part.timelife = 0.0;
    part.child = false; 
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
    part.templateIndex = 0;
}
 
void initChild(out Part part, int partId, float3 pos)
{
    part.pos = pos;
    part.size = 0.05;
    part.timelife = 0.8;
    part.child = true;
    part.speed = float3(0.f);
    part.templateIndex = 1;
}

/** Return false if you want to kill particle. */
bool update(inout Part part, int partId)
{
    
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    if (part.child == false) {
        part.size = 0.4f; 
        part.pos = parentPosition + part.speed * part.timelife * 3.0f;
        spawn(1) initChild(part.pos); 
        draw P0(part);
    } else {
        part.size = (part.timelife - 0.8) / 0.2 * 0.1;
        draw P1(part);
       
    }

    return part.timelife < 1.0f;
}

struct EMITTER 
{
    int i;
    float time;
};
 
void SpawnGeneric(inout EMITTER emit)
{
    if (elapsedTimeLevel - emit.time > 1.0f) {
        int n = (int)((sin(elapsedTimeLevel * 100.f) + 1.f) * 5.f);
        spawn(n) init(); 
        emit.i += 1;
        emit.time = elapsedTimeLevel;
    }
}

int prerender(inout Part part, inout DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = part.size;
    input.color = float4(abs(part.speed), 1.0f - part.timelife);
    return asint(distance(part.pos, cameraPosition));
}


int prerender2(inout Part part, inout DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = part.size;
    input.color = float4(float3(1.0f, 0.f, 0.f), 1.0f - part.timelife);
    return asint(distance(part.pos, cameraPosition));
}


void packLwiTransform(in float3 pos, in float3 speed, in float3 size, out float3x4 matr)
{
    matr[0] = float4(size.x, 0, 0, pos.x);
    matr[1] = float4(0, size.y, 0, pos.y);
    matr[2] = float4(0, 0, size.z, pos.z);
}

// instanceTotal avaialable in prerender pass for known TPL
uniform uint   instanceTotal: INSTANCE_TOTAL; // number of difference lwi instances

int prerender3(inout Part part, inout LwiInstance input)
{
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiTransform(part.pos, part.speed, float3(part.size), input.worldMatr);
    // sorting(part.templateIndex);
    return part.templateIndex % instanceTotal;
}  


struct Geometry {
    float3 pos: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};


struct PixelInputType
{
    float4 position : POSITION;
    float4 color : COLOR;
};



int prerender4(inout Part part, inout LwiInstance input)
{
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    input.worldMatr = packLwiRotXToDir(part.pos, part.speed, float3(part.size));
    return 0;
}  

uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

// PixelInputType VSCylinders(LwiInstance partInstance, Geometry geometry)
// {
//     PixelInputType res;

//     float3 wnorm;
//     wnorm = mul(modelMatrix, float4(geometry.normal, 0.f)).xyz;

//     float4 zero = float4(geometry.pos, 1.f);
    
//     float4 p;
//     p.x = dot(partInstance.worldMatr[0], zero);
//     p.y = dot(partInstance.worldMatr[1], zero);
//     p.z = dot(partInstance.worldMatr[2], zero);
//     p.w = 1.f;
    
     
//     res.position = mul(viewMatrix, res.position);
//     res.position = mul(projectionMatrix, res.position);
    
//     // Store the input color for the pixel shader to use.
//     float3 lightDir;
//     lightDir = normalize(float3(1.f, 4.f, 0.f));

//     float NdL;
//     NdL = max(0.f, dot(geometry.normal, lightDir) * 0.5);
//     res.color = float4(1,1,0,1);//float4(float3(NdL), 0.f) + float4(1, 0, 0, 1.f);
    
//     return res;
// }



// float4 PSCylinders(PixelInputType input) : COLOR
// {
//     return input.color;
// }


partFx project.awesome {
    Capacity = 8000;
    SpawnRoutine = compile SpawnGeneric();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender4();
        Geometry = "arrow";
        // VertexShader = compile VSCylinders();
        // PixelShader = compile PSCylinders();
    }

    pass P1 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender();
        Geometry = Sphere;
    }
}


partFx some.example {
    Capacity = 1000;
    SpawnRoutine = compile SpawnRegular();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 { 
        Sorting = TRUE;
        Geometry = Sphere;
        PrerenderRoutine = compile prerender2();
    }
}


partFx lwi {
    Capacity = 1000;
    SpawnRoutine = compile SpawnRegular();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender3();
        Geometry = "sfx_leaves";
    }
}