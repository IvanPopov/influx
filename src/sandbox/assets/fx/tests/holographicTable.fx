
uniform float elapsedTime;
uniform float elapsedTimeLevel;

float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) 
        * 43758.5453123f);
}


float3 randVUnit (float seed)
{
   float3 v;
   v.x =  random(float2(seed, 0.f)) - 0.5f; 
   v.y =  random(float2(seed, 1.f)) - 0.5f;
   v.z =  random(float2(seed, 2.f)) - 0.5f; 
   return normalize(v);
}

float4 myLerp(float4 a, float4 b) {
    return lerp(a, b, 0.5f);
}

float noise (in float2 st) {
    float2 i = floor(st);
    float2 f = frac(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + float2(1.0f, 0.0f));
    float c = random(i + float2(0.0f, 1.0f));
    float d = random(i + float2(1.0f, 1.0f));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    float2 u = f * f * (3.0f - 2.0f * f);
    // u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return lerp(a, b, u.x) +
            (c - a) * u.y * (1.0f - u.x) +
            (d - b) * u.x * u.y;
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
      angle = deg2rad(random(float2(elapsedTimeLevel, 
        (float)partId * elapsedTime)) * angle);
      vRand = vBaseNorm * cos(angle) + vTang * sin(angle);
      vRand = normalize(vRand);
  // } else   {
  //    vRand = vBase;
 //  }

   return vRand;
}


float3 randUnitCircle(int partId) 
{
    float2 seed = float2(elapsedTimeLevel, (float)partId * elapsedTime);
    float alpha = random(seed) * 3.14f * 2.f;
    float dist = random(seed * 2.f);
    return float3(sin(alpha), 0.f, cos(alpha)) * dist;
}

struct Part {
    float3 speed;
    float3 pos;
    float3  size;
    float  timelife;
};

/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    float3 pos   : POSITION1;
    float4 color : COLOR1;
    float  size  : SIZE1;
};



uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

struct PartInstance {
    float3 pos   : POSITION1;
    float4 color : COLOR1;
    float3 size  : SIZE1;
};

/////////////////////////////////////////////////////////////////////
// Spawn Routine
/////////////////////////////////////////////////////////////////////
int Spawn()
{
    return 400;
}

float3 sizeFromPos(float3 pos) {
    return float3(1.f, noise(pos.xz + float2(elapsedTimeLevel * 1.f, 0.f)) * 20.f, 1.f) * 0.04f;
}

/////////////////////////////////////////////////////////////////////
// Init Routine
/////////////////////////////////////////////////////////////////////
void Init(out Part part, int partId)
{
    
    part.pos = randUnitCircle(partId);
    //float h = random(float2(elapsedTime, (float)partId)) * 20.f;
    part.size = sizeFromPos(part.pos);
    part.timelife = 0.0;
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

/////////////////////////////////////////////////////////////////////
// Update Routine
/////////////////////////////////////////////////////////////////////
bool Update(inout Part part)
{
    //part.pos = part.pos + part.speed * elapsedTime;
    part.size = sizeFromPos(part.pos);
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

/////////////////////////////////////////////////////////////////////
// Prerender Routine
/////////////////////////////////////////////////////////////////////
void PrerenderCylinders(inout Part part, out PartInstance instance)
{
    instance.pos.xyz = part.pos.xyz + float3(part.size) * 0.5f;
    instance.size = float3(part.size);
    instance.color = float4(0.f, 0.f, 1.f, 0.5f * sin(part.timelife * 3.14));
}


/////////////////////////////////////////////////////////////////////
// Prerender Routine
/////////////////////////////////////////////////////////////////////
void PrerenderLines(inout Part part, out DefaultShaderInput input)
{
    input.pos.xyz = part.pos * float3(1.f, -1.f, 1.f);
    input.size = part.size.x;
    input.color = float4(abs(part.speed).zxy, sin(part.timelife * 3.14));
}


/////////////////////////////////////////////////////////////////////
// Shaders
/////////////////////////////////////////////////////////////////////


struct Geometry {
    float3 position: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};

struct PixelInputType
{
    float4 position : POSITION;
    float4 color : COLOR;
};



// vec4 viewPos = modelViewMatrix * vec4(offset, 1.0) + vec4(position * size, 0.0);
// gl_Position = projectionMatrix * viewPos;

PixelInputType ColorVertexShader(PartInstance partInstance, Geometry geometry)
{
    PixelInputType res;

    float3 wnorm;
    wnorm = mul(modelMatrix, float4(geometry.normal, 0.f)).xyz;
     
    // Calculate the position of the vertex against the world, view, and projection matrices.
    res.position = mul(modelMatrix, float4(partInstance.pos + geometry.position * partInstance.size, 1.f));
    res.position = mul(viewMatrix, res.position);
    res.position = mul(projectionMatrix, res.position);
    
    // Store the input color for the pixel shader to use.
    float3 lightDir;
    lightDir = normalize(float3(0.f, 1.f, 1.f));

    float NdL;
    NdL = max(0.f, dot(geometry.normal, lightDir) * 0.5);
    // partInstance.color + 
    res.color = float4(float3(NdL), 0.f) + partInstance.color;//float4(abs(wnorm), partInstance.color.a);
    
    return res;
}


float4 ColorPixelShader(PixelInputType input) : COLOR
{
    return input.color;
}


/////////////////////////////////////////////////////////////////////
// Setup
/////////////////////////////////////////////////////////////////////
 
partFx holographicTable {
    Capacity = 2048;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile Init();
    UpdateRoutine = compile Update();

    pass Cylinders {
        Sorting = true;
        PrerenderRoutine = compile PrerenderCylinders();
        Geometry = Box;

        ZWriteEnable = false;
		AlphaBlendEnable = true;

        VertexShader = compile ColorVertexShader();
        PixelShader = compile ColorPixelShader();
    }

    // pass Lines {
    //     Sorting = true;
    //     PrerenderRoutine = compile PrerenderLines();
    //     Geometry = billboard;

    //     ZWriteEnable = false;
	// 	AlphaBlendEnable = true;
    // }
}

