
uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;
uniform float3 parentPosition: PARENT_POSITION;

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

//    if (!normalize(vBaseNorm)) {
//       return float3(0.f);
//    }

   v = randVUnit(elapsedTimeLevel);
   vTang = v - vBaseNorm * dot(v, vBaseNorm);

 //  if (sqrt(dot(vTang, vTang)) > 0.0001f)   {
      vTang = normalize(vTang);
      angle = deg2rad(random(float2(elapsedTimeLevel, (float)partId * elapsedTime)) * angle);
      vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
      vRand = normalize(vRand);
  // } else   {
  //    vRand = vBase;
 //  }

   return vRand;
}

struct Part {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
    bool child;
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
    return 5;
}

void init(out Part part, int partId)
{
    part.pos = parentPosition + float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1; 
    part.timelife = 0.0;
    part.child = false; 
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

void initChild(out Part part, int partId, float3 pos)
{
    part.pos = pos;
    part.size = 0.05;
    part.timelife = 0.8;
    part.child = true;
    part.speed = float3(0.f);
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    if (part.child == false) {
        part.pos = parentPosition + part.speed * part.timelife * 3.0f;
        spawn(1) initChild(part.pos);
    } else {
        part.size = (part.timelife - 0.8) / 0.2 * 0.1;
    }
    return part.timelife < 1.0f;
}

uniform float3 cameraPosition: CAMERA_POSITION;

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

// Warning: Do not change layout of this structure!
struct LwiInstance {
    float4 dynData[2]: META;
    float3x4 worldMatr: TRANSFORM0;
    float3x4 worldMatrPrev: TRANSFORM1;
};

void packLwiTransform(in float3 pos, in float3 speed, in float3 size, out float3x4 matr)
{
    matr[0] = float4(size.x, 0, 0, pos.x);
    matr[1] = float4(0, size.y, 0, pos.y);
    matr[2] = float4(0, 0, size.z, pos.z);
}


int prerender3(inout Part part, inout LwiInstance input)
{
    // IP: todo: add support of direct matrix assigment
    // input.worldMatrPrev = input.worldMatr;
    input.worldMatrPrev[0] = input.worldMatr[0];
    input.worldMatrPrev[1] = input.worldMatr[1];
    input.worldMatrPrev[2] = input.worldMatr[2];

    packLwiTransform(part.pos, part.speed, float3(part.size), input.worldMatr);
    // sorting(part.templateIndex);
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


partFx lwi {
    Capacity = 1000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile prerender3();
        Geometry = Sphere;
    }
}