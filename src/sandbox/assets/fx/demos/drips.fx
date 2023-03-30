// https://www.shadertoy.com/view/tstXRj

#include "./drips/common.fx"
#include "./drips/bufferA.fx"
#include "./drips/bufferB.fx"
#include "./drips/main.fx"

RenderTargetView g_BufferA0RTV<string texture="g_BufferA0";>;
Texture2D g_BufferA0;

RenderTargetView g_BufferA1RTV<string texture="g_BufferA1";>;
Texture2D g_BufferA1;

RenderTargetView g_BufferB0RTV<string texture="g_BufferB0";>;
Texture2D g_BufferB0;

RenderTargetView g_BufferB1RTV<string texture="g_BufferB1";>;
Texture2D g_BufferB1;

RenderTargetView g_BufferM0RTV<string texture="g_BufferM0";>;
Texture2D g_BufferM0;

RenderTargetView g_BufferM1RTV<string texture="g_BufferM1";>;
Texture2D g_BufferM1;


struct VS_QUAD_OUTPUT
{
    float4 Position   : SV_POSITION; 
    float2 TextureUV  : TEXCOORD0;
};

struct PS_OUTPUT
{
    float4 RGBColor : SV_Target;  // Pixel color
};


VS_QUAD_OUTPUT RenderQuadVS(float4 vPos : POSITION, float2 vTexCoord0 : TEXCOORD)
{
    VS_QUAD_OUTPUT Output;
    Output.Position = float4(vPos.xy, 0.f, 1.f);
    Output.TextureUV = vTexCoord0; 
    return Output;    
}


PS_OUTPUT RenderBufferA( VS_QUAD_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor.a = elapsedTime * 0.f;  // FIXME: fix layout autogen
    if ((iFrame % 2) == 0)
        BufferA(Output.RGBColor, In.Position.xy, g_BufferA0);
    else
        BufferA(Output.RGBColor, In.Position.xy, g_BufferA1);
    
    return Output;
}

// 0: A, 1: B, 2: rgba noise (g_Distortion), 3: pebbles (g_Color)
PS_OUTPUT RenderBufferB( VS_QUAD_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor.a = elapsedTime * 0.f; // FIXME: fix layout autogen
    if ((iFrame % 2) == 0)
        BufferB(Output.RGBColor, In.Position.xy, g_BufferA0, g_BufferB0, g_Distortion, g_Color);
    else
        BufferB(Output.RGBColor, In.Position.xy, g_BufferA0, g_BufferB1, g_Distortion, g_Color);

    return Output;
}


PS_OUTPUT RenderMain( VS_QUAD_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor.a = elapsedTime * 0.f;
    if ((iFrame % 2) == 0)
        MainImage(Output.RGBColor, In.Position.xy, g_BufferB0, g_BufferA0);
    else
        MainImage(Output.RGBColor, In.Position.xy, g_BufferB1, g_BufferA1);
    
    Output.RGBColor.a = 1.f;
    return Output;
}


/////////////////////////////////////////////////////////////////////
struct VS_OUTPUT
{
    float4 Position   : SV_POSITION; 
    float2 TextureUV  : TEXCOORD0;
};

float4x4 g_mWorldViewProjection: MODEL_VIEW_PROJECTION_MATRIX;

VS_OUTPUT RenderSceneVS( float4 vPos : POSITION,
                         float3 vNormal : NORMAL,
                         float2 vTexCoord0 : TEXCOORD)
{
    VS_OUTPUT Output;
    Output.Position = mul(vPos, g_mWorldViewProjection);
    Output.TextureUV = vTexCoord0; 
    return Output;    
}


PS_OUTPUT RenderScenePS( VS_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor.a = elapsedTime * 0.f;
    if ((iFrame % 2) == 0)
        Output.RGBColor = g_BufferM0.Sample(SamplerLinear, In.TextureUV);
    else
        Output.RGBColor = g_BufferM1.Sample(SamplerLinear, In.TextureUV);
    
    return Output;
}

void SetBufferATarget()
{
    if ((iFrame % 2) != 0u) 
        SetRenderTargets( g_BufferA0RTV, NULL );
    else
        SetRenderTargets( g_BufferA1RTV, NULL );
}

void SetBufferBTarget()
{
    if ((iFrame % 2) != 0u) 
        SetRenderTargets( g_BufferB0RTV, NULL );
    else
        SetRenderTargets( g_BufferB1RTV, NULL );
}

void SetBufferMTarget()
{
    if ((iFrame % 2) != 0u) 
        SetRenderTargets( g_BufferM0RTV, NULL );
    else
        SetRenderTargets( g_BufferM1RTV, NULL );
}


technique11 WaterDrips
{
    pass BufferA
    {
        SetBufferATarget();
        SetDepthStencilState( NoDepth, 0 );

        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderQuadVS( ) ) );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderBufferA(  ) ) );

        // SetRenderTargets( NULL, NULL );
    }

    pass BufferB
    {
        SetBufferBTarget();
        SetDepthStencilState( NoDepth, 0 );

        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderQuadVS( ) ) );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderBufferB(  ) ) );

        // SetRenderTargets( NULL, NULL );
    }

    pass BufferM
    {
        SetBufferMTarget();
        SetDepthStencilState( NoDepth, 0 );

        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderQuadVS( ) ) );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderMain(  ) ) );

        // SetRenderTargets( NULL, NULL );
    }

    pass OnScreen
    {
        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderSceneVS( ) ) );
        SetGeometryShader( NULL );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderScenePS(  ) ) );

        SetDepthStencilState( EnableDepth, 0 );
    }
}
