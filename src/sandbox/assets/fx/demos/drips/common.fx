#ifndef __COMMON__
#define __COMMON__



float saturate(float x)
{
    return clamp(x, 0., 1.);
}

uint baseHash(uint p)
{
    p = 1103515245U*((p >> 1U)^(p));
    uint h32 = 1103515245U*((p)^(p>>3U));
    return h32^(h32 >> 16);
}

float2 hash21(int x)
{
    uint n = baseHash(uint(x));
    uint2 rz = uint2(n, n*48271U); //see: http://random.mat.sbg.ac.at/results/karl/server/node4.html
    return float2((rz.xy >> 1) & uint2(0x7fffffffU))/float(0x7fffffff);
}

float2 hash21f(float p)
{
	float3 p3 = frac(float3(p) * float3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx + 33.33);
    return frac((p3.xx + p3.yz) * p3.zy);
}

float hash11(int x)
{
    uint n = baseHash(uint(x));
    return float(n)*(1.0/float(0xffffffffU));
}

float3 buildnormalz(float2 normal)
{
    return float3(normal, sqrt(1. - normal.x*normal.x - normal.y*normal.y));
}

// todo: use predefined common sampler ?
SamplerState SamplerLinear
{
    Filter = MIN_MAG_MIP_LINEAR;
    AddressU = Wrap;
    AddressV = Wrap;
}; 

DepthStencilState NoDepth
{
    DepthEnable = FALSE;
    DepthFunc = ALWAYS;
};

DepthStencilState EnableDepth
{
    DepthEnable = TRUE;
    DepthWriteMask = ALL;
    DepthFunc = LESS_EQUAL;
};


float4 multisample( Texture2D tex, float2 uv, float mip, float offset)
{
	float4 outcol;
    outcol += tex.SampleBias( SamplerLinear, uv + float2(    0.0,    0.0), mip);
    outcol += tex.SampleBias( SamplerLinear, uv + float2( offset, offset), mip);
    outcol += tex.SampleBias( SamplerLinear, uv + float2(-offset, offset), mip);
    outcol += tex.SampleBias( SamplerLinear, uv + float2( offset,-offset), mip);
    outcol += tex.SampleBias( SamplerLinear, uv + float2(-offset,-offset), mip);
    return outcol * 0.2;
}

/*
float4 multisample( sampler2D tex, float2 uv, float mip, float offset)
{
	float4 outcol;
    outcol += texture( tex, uv + float2(    0.0, 0.0), mip);
    outcol += texture( tex, uv + float2( offset, 0.0), mip);
    outcol += texture( tex, uv + float2(-offset, 0.0), mip);
    outcol += texture( tex, uv + float2( 0.0, offset), mip);
    outcol += texture( tex, uv + float2( 0.0,-offset), mip);
    return outcol * 0.2;
}
*/


uint2 Texture2DSize(in Texture2D tex) {
    uint2 dim;
    tex.GetDimensions(dim[0], dim[1]);
    return dim;
}



//some basic controls

uniform uint iFrame: FRAME_NUMBER;
uniform float elapsedTime: ELAPSED_TIME;
uniform float2 iResolution: RESOLUTION; // w, h
uniform float iTime: ELAPSED_TIME_LEVEL;
uniform float4 iDate: DATE;

bool DEBUG<string UIName = "DEBUG";> = false;

uint COUNT<string UIName = "COUNT";> = 256;
float GRAVITY<string UIName = "GRAVITY";> = 0.01;
float DROPSIZE<string UIName = "DROPSIZE";> = 0.5;
float DROPJITTER<string UIName = "DROPJITTER";> = 0.2;
float LIFETIME<string UIName = "LIFETIME";> = 300;
float BLUR<string UIName = "BLUR";  string UIType = "slider"; float UIMin = 0.0f; float UIMax = 3.00f; > = 2.f;
float GROOVE<string UIName = "GROOVE";  string UIType = "slider"; float UIMin = 0.0f; float UIMax = 1.00f; > = 1.f;

Texture2D g_Background<string UIName = "Background";string name = "saber-logo-opaque.png";>;
Texture2D g_BlueNoise<string UIName = "Blue Noise";string name = "bluenoise1024.png";>;
Texture2D g_Distortion<string UIName = "Distortion";string name = "rgba_noise64.png";>;
Texture2D g_Color<string UIName = "Color";string name = "pebbles.png";>;


#endif

