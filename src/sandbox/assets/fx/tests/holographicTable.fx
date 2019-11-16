uniform float elapsedTime;
uniform float elapsedTimeLevel;

float random (float2 uv)
{
    return frac(sin(dot(uv, float2(12.9898f, 78.233f))) 
        * 43758.5453123f);
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
    float3 size;
    float  timelife;
};


uniform float4x4 modelViewMatrix;
uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

struct PartInstance {
    float3 pos   : POSITION1;
    float4 color : COLOR1;
    float3 size  : SIZE1;
};

struct PointInstance {
    float3 pos   : POSITION1;
    float4 color : COLOR1;
};


float4 ColorOverAge(Part part) {
    float h = part.size.y / 0.9f;
    float3 w = float3(0.7f);
    float3 bc = float3(0.f, 0.7f, 0.9f) * 0.4;
    float3 c = float3(lerp(bc.x, w.x, h), lerp(bc.y, w.y, h), lerp(bc.z, w.z, h));
    return float4(c, 0.8f * (h + 0.5f) * sin(part.timelife * 3.14));
}

/////////////////////////////////////////////////////////////////////
// Spawn Routine
/////////////////////////////////////////////////////////////////////
int Spawn()
{
    return 700;
}

float3 sizeFromPos(float3 pos) {
    return float3(1.f, noise(pos.xz * 1.3f + float2(elapsedTimeLevel * 1.f, 0.f)) / 0.06f, 1.f) * 0.03f;
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
    part.speed = float3(0.f);
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
    instance.color = ColorOverAge(part);
}




/////////////////////////////////////////////////////////////////////
// Prerender Routine
/////////////////////////////////////////////////////////////////////
void PrerenderLines(inout Part part, out PointInstance instance, int instanceId)
{
    float k = (float)instanceId;
    float3 pos = part.pos.xyz + float3(part.size.x * 0.5f, part.size.y, part.size.z * 0.5f);
    instance.pos = lerp(pos, float3(0.0, 0.7, 0.0), k);
    instance.color = lerp(ColorOverAge(part), float4(1.f, 1.f, 1.f, 0.f), k);
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

PixelInputType VSCylinders(PartInstance partInstance, Geometry geometry)
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
    lightDir = normalize(float3(1.f, 4.f, 0.f));

    float NdL;
    NdL = max(0.f, dot(geometry.normal, lightDir) * 0.5);
    // partInstance.color + 
    res.color = float4(float3(NdL), 0.f) + partInstance.color;//float4(abs(wnorm), partInstance.color.a);
    
    return res;
}


float4 PSCylinders(PixelInputType input) : COLOR
{
    return input.color;
}

PixelInputType VSLines(PointInstance instance)
{
    PixelInputType res;

    res.position = mul(projectionMatrix, mul(modelViewMatrix, float4(instance.pos, 1.f)));
    res.color = instance.color;
    
    return res;
}

float4 PSLines(PixelInputType input) : COLOR
{
    return input.color;
}

/////////////////////////////////////////////////////////////////////
// Setup
/////////////////////////////////////////////////////////////////////
partFx holographicTable 
{
    Capacity = 4000;
    SpawnRoutine = compile Spawn();
    InitRoutine = compile Init();
    UpdateRoutine = compile Update();

    pass Cylinders {
        Sorting = true;
        PrerenderRoutine = compile PrerenderCylinders();
        Geometry = Cylinder;

        ZWriteEnable = false;

        VertexShader = compile VSCylinders();
        PixelShader = compile PSCylinders();
    }

    pass Lines {
        Sorting = false;
        PrerenderRoutine = compile PrerenderLines();
        Geometry = Line;

        ZWriteEnable = false;

        InstanceCount = 2;
        // PrimitiveTopology = LineList;

        VertexShader = compile VSLines();
        PixelShader = compile PSLines();
    }
}
