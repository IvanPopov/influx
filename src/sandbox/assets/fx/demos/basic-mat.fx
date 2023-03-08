uniform float elapsedTime;
uniform float elapsedTimeLevel;

uniform float4x4 modelViewMatrix;
uniform float4x4 modelMatrix;
uniform float4x4 viewMatrix;
uniform float4x4 projectionMatrix;

   
struct Geometry {
    float3 position: POSITION0;
    float3 normal: NORMAL0;
    float2 uv: TEXCOORD0;
};

struct PixelInputType
{
    float4 position : POSITION;
    float2 uv : TEXCOORD0;
};

float floatMod(float a, float b)
{
    return (a - b * floor(a / b));
}

 
PixelInputType VSSolid(Geometry geometry)
{
    PixelInputType res;

    float3 wnorm;
    wnorm = mul(modelMatrix, float4(geometry.normal, 0.f)).xyz;
     
    // Calculate the position of the vertex against the world, view, and projection matrices.
    res.position = mul(modelMatrix, float4(geometry.position, 1.f));
    res.position = mul(viewMatrix, res.position);
    res.position = mul(projectionMatrix, res.position);
    res.uv = geometry.uv;
    return res;
}

Texture2D albedo<string name = "uv_checker.png";>; 
SamplerState linearSampler;

float4 PSSolid(PixelInputType input) : COLOR
{
    return albedo.Sample(linearSampler, input.uv);
}


technique Basic 
{
    pass {
        ZEnable = true;
        BlendEnable = false;
        VertexShader = compile /*vs_6_2*/ VSSolid(); 
        PixelShader = compile /*ps_6_2*/ PSSolid();
    }
}
