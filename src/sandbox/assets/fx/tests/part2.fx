
uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;
uniform float unknownGlobal;

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

float3 RndVUnitConus (float3 vBaseNorm, float angle)
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
      angle = deg2rad(random(float2(elapsedTime, 100.f)) * angle);
      vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
      vRand = normalize(vRand);
  // } else   {
  //    vRand = vBase;
 //  }

   return vRand;
}

float3 RndSphere(float rad)
{
    float phi = random(float2(elapsedTimeLevel, 15.f)) * deg2rad(360.f);
    float theta = random(float2(elapsedTimeLevel, 20.f)) * deg2rad(360.f);

    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);

    return float3(sinPhi * cosTheta, sinPhi * sinTheta, cosTheta) * rad;
}

struct Part {
    float3 dir;
    float3 pos;
    float size;
    float timelife;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};

float4 foo() {
    float4 x = float4(10.f);
    return float4(x.ab, x.rr);
}




int summ(int a, int b) { return a + b; }
int spawn()
{
    return summ(1, 1000);
}

void init(out Part part)
{
    part.pos = RndSphere(1.f);//float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    
    float3 dir;
    // dir.x = random(float2(elapsedTimeLevel, 1.f));
    // dir.y = random(float2(elapsedTimeLevel, 2.f));
    // dir.z = random(float2(elapsedTimeLevel, 3.f));

    part.dir = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f);
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    part.pos = part.pos + part.dir * elapsedTime * 0.0f;
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

void prerender(inout Part part, out DefaultShaderInput input)
{
    // input.pos = part.pos;
    input.pos.xyz = part.pos.xyz;
    input.size = part.size;
    input.color = float4(abs(part.dir), 1.0f - part.timelife);// + float4(1.0, 0.5, 10.0, 0.0).yxww;
}

partFx project.awesome {
    Capacity = 100;
    SpawnRoutine = compile spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        DefaultShader = TRUE;
        PrerenderRoutine = compile prerender();
    }
}

partFx incomplete {

}