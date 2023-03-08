
uniform float elapsedTime;
uniform float elapsedTimeLevel;

float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

float deg2rad(float deg) 
{
    return ((deg) * 3.14f / 180.f);
}

float3 rndSphere(float rad, int partId)
{
    float id = (float)partId;
    float phi = random(float2(elapsedTimeLevel, id)) * deg2rad(360.f);
    float theta = random(float2(elapsedTimeLevel, id * 2.f)) * deg2rad(360.f);

    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);

    return float3(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi) * rad;
}

struct Part {
    float startTime;
    float3 speed;
    float3 pos;
    float size;
    float timelife;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};


int Spawn()
{
    return 300;
}

void init(inout Part part, int partId)
{
    part.startTime = elapsedTimeLevel;
    part.pos = rndSphere(1.f, partId) * 0.2f;//float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    part.speed = normalize(part.pos) * 0.2f + float3(0,2.0,0);
}


/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    //part.pos = part.pos + sin(part.dir) * 0.2f;
    // max timelime is 3 sec;
    part.timelife = (part.timelife + elapsedTime / 5.0f);
    return part.timelife < 1.0f;
}

uniform float3 cameraPosition: CAMERA_POSITION;
int prerender(inout Part part, inout DefaultShaderInput input)
{
    float dt = elapsedTimeLevel - part.startTime;
    input.pos.xyz = part.pos + part.speed * dt + float3(0.f, -1.f, 0.f) * dt * dt * 0.5f;
    input.size = part.size;
    input.color = float4(input.pos, 1.0f - part.timelife);
    return asint(distance(part.pos, cameraPosition));
}


partFx project.awesome {
    Capacity = 6000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = true;
        Geometry = sphere;
        PrerenderRoutine = compile prerender();
    }
}

partFx incomplete {

}