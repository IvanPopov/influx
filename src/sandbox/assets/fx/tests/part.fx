float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) * 43758.5453123f);
}

/*
float3 randVUnit (int iPart)
{
   float fPart = float(iPart);
   float3 v;
   v.x =  random(float2(fPart, 0.f)) - 0.5f; 
   v.y =  random(float2(fPart, 1.f)) - 0.5f;
   v.z =  random(float2(fPart, 2.f)) - 0.5f; 
   normalize(v);
   return;
}*/
/*
float3 RndVUnitConus (float3 _vBase, float angle)
{
   float3   vBaseScale, vTangScale;
   float3   v, vTang;
   float  a;
   float3 vBaseNorm = _vBase;

   if (!normalize(vBaseNorm)) {
      return float3(0.f);
   }

   float3 vBase = vBaseNorm;

   RndVUnit(&v);
   m3dTangentComponent(v, *vBase, vTang);
   if (m3dLengthVector(vTang) > M3D_EPSILON)   {
      m3dNormalize(vTang);
      a = m3dDeg2Rad(RndFloatMax(angle));
      m3dScaleVector(*vBase,  m3dCos(a), vBaseScale);
      m3dScaleVector(vTang, m3dSin(a), vTangScale);
      m3dAddVector(vBaseScale, vTangScale, *vRand);
      m3dNormalize(*vRand);
   } else   {
      *vRand = *vBase;
   }

   return;
}
*/


// int main() {

//     return (int)(random(float2(1.f, 2.f)) * 1000.f);
// }

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

uniform float elapsedTime: ELAPSED_TIME;
uniform float elapsedTimeLevel: ELAPSED_TIME_LEVEL;
uniform float unknownGlobal;


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
    return summ(1, 10);
}

void init(out Part part)
{
    part.pos = float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    
    float3 dir;
    dir.x = random(float2(elapsedTimeLevel, 1.f));
    dir.y = random(float2(elapsedTimeLevel, 2.f));
    dir.z = random(float2(elapsedTimeLevel, 3.f));

    part.dir = dir * 2.f - 1.f;
}


/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    part.pos = part.dir * part.timelife * 3.0f;
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