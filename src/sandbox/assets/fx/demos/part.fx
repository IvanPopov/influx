
uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;

int density <
  string UIName = "Density";
> = 50;  
 
float scale <
  string UIType = "slider";
  string UIName = "Scale";
  float UIMin = 0.f;
  float UIMax = 1.0f;  
> = {1.f};  

float size <
  string UIType = "slider";
  string UIName = "Size";
  float UIMin = 0.001f;
  float UIMax = 2.0f;  
> = {1.f}; 
 

float4 color <
    string UIType = "Color";
> = {1.f, 0.f, 1.f, 1.f};


float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

float3 randVUnit (float seed)
{
   float3 v;
   v.x =  random(float2(seed, 0.f)) - 0.5f; 
   v.y =  random(float2(seed, 1.f)) - 0.5f;
   v.z =  random(float2(seed, 2.f)) - 0.5f; 
   return normalize(v);
}

float deg2rad(float deg) 
{
    return ((deg) * 3.14f / 180.f);
}

float3 RndVUnitConus (float3 vBaseNorm, float angle, int partId = 0)
{
    float3   vRand;
    float3   vBaseScale, vTangScale;
    float3   v, vTang;

    v = randVUnit(elapsedTimeLevel);
    vTang = v - vBaseNorm * dot(v, vBaseNorm);

    vTang = normalize(vTang);
    angle = deg2rad(random(float2(elapsedTimeLevel, (float)partId * elapsedTime)) * angle);
    vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
    vRand = normalize(vRand);
    return vRand;
}

struct Part {
    float3 speed;
    float3 pos : POSITION;
    float size;
    float timelife;
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
    return density;
}
 
void init(out Part part, int partId)
{
    part.pos = float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    part.pos = part.speed * part.timelife * 3.0f * size;
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

uniform float3 cameraPosition: CAMERA_POSITION;

int prerender2(inout Part part, inout DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = part.size * scale;
    input.color = float4(abs(part.speed), 1.0f - part.timelife);
    return asint(distance(part.pos, cameraPosition));
}


int prerender(inout Part part, inout DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = part.size * scale;
    input.color = float4(float3(1.0f, 1.f, 1.f), 1.0f - part.timelife) * color;
    return asint(distance(part.pos, cameraPosition));
}


partFx project.awesome {
    Capacity = 1000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender();
    }

    preset X {
        density = 10; 
        scale = {2.f};
        color = {1, 0, 0, 1}; 
    }
}


partFx some.example {
    Capacity = 1000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender2();
    }

}