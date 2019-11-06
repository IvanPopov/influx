
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

struct Part {
    float3 speed;
    float3 pos;
    float  size;
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
    float  size  : SIZE1;
};

/////////////////////////////////////////////////////////////////////
// Spawn Routine
/////////////////////////////////////////////////////////////////////
int Spawn()
{
    return 400;
}

/////////////////////////////////////////////////////////////////////
// Init Routine
/////////////////////////////////////////////////////////////////////
void Init(out Part part, int partId)
{
    part.pos = float3(0.f, float2(0.0).x, 0.0);
    part.size = 0.1;
    part.timelife = 0.0;
    part.speed = RndVUnitConus(float3(0.f, 1.f, 0.f), 45.f, partId);
}

/////////////////////////////////////////////////////////////////////
// Update Routine
/////////////////////////////////////////////////////////////////////
bool Update(inout Part part)
{
    part.pos = part.speed * part.timelife * 3.0f;
    part.timelife = (part.timelife + elapsedTime / 3.0f);
    return part.timelife < 1.0f;
}

/////////////////////////////////////////////////////////////////////
// Prerender Routine
/////////////////////////////////////////////////////////////////////
void PrerenderCylinders(inout Part part, out PartInstance instance)
{
    instance.pos.xyz = part.pos.xyz;
    instance.size = part.size;
    instance.color = float4(abs(part.speed), sin(part.timelife * 3.14));
}


/////////////////////////////////////////////////////////////////////
// Prerender Routine
/////////////////////////////////////////////////////////////////////
void PrerenderLines(inout Part part, out DefaultShaderInput input)
{
    input.pos.xyz = part.pos * float3(1.f, -1.f, 1.f);
    input.size = part.size;
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
    
    // Calculate the position of the vertex against the world, view, and projection matrices.
    res.position = mul(modelMatrix, float4(partInstance.pos, 1.f));
    res.position = mul(viewMatrix, res.position) + float4(geometry.position * partInstance.size, 1.f);
    res.position = mul(projectionMatrix, res.position);
    
    // Store the input color for the pixel shader to use.
    res.color = partInstance.color;
    
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
        Geometry = sphere;

        ZWriteEnable = false;
		AlphaBlendEnable = true;

        VertexShader = compile ColorVertexShader();
        PixelShader = compile ColorPixelShader();
    }

    pass Lines {
        Sorting = true;
        PrerenderRoutine = compile PrerenderLines();
        Geometry = billboard;

        ZWriteEnable = false;
		AlphaBlendEnable = true;
    }
}

