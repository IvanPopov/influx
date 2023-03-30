float4 g_MaterialAmbientColor<string UIName = "Ambient Color"; string UIType = "color";> = { 1.f, 1.f, 1.f, 1.f };
float4 g_MaterialDiffuseColor<string UIName = "Diffuse Color"; string UIType = "color";> = { 1.f, 1.f, 1.f, 1.f };

float3 g_LightDir<string UIName = "Light Dir";> = { 0.7, 0.7, 0.f };
float4 g_LightDiffuse<string UIName = "Light Diffuse";> = { 2.f, 2.f, 2.f, 0.f }; 
float4 g_LightAmbient<string UIName = "Light Ambient";> = { 0.5f, 0.5f, 0.5f, 0.f };

Texture2D g_InputTexture<string UIName = "Mesh Texture";string name = "uv_checker.png";>;

float    g_fTime: ELAPSED_TIME_LEVEL; 
float4x4 g_mWorld: MODEL_MATRIX;
float4x4 g_mWorldViewProjection: MODEL_VIEW_PROJECTION_MATRIX;

DepthStencilState EnableDepth
{
    DepthEnable = TRUE;
    DepthWriteMask = ALL;
    DepthFunc = LESS_EQUAL;
};


DepthStencilState NoDepth
{
    DepthEnable = FALSE;
    DepthFunc = ALWAYS;
};


SamplerState MeshTextureSampler
{
    Filter = MIN_MAG_MIP_LINEAR;
    AddressU = Wrap;
    AddressV = Wrap;
}; 



RenderTargetView g_Rtv0<string format="rgba32"; string texture="g_Tex0";>;
Texture2D g_Tex0;

struct VS_OUTPUT
{
    float4 Position   : SV_POSITION; 
    float4 Diffuse    : COLOR0;
    float2 TextureUV  : TEXCOORD0;
};


VS_OUTPUT RenderSceneVS( float4 vPos : POSITION,
                         float3 vNormal : NORMAL,
                         float2 vTexCoord0 : TEXCOORD)
{
    VS_OUTPUT Output;
    float3 vNormalWorldSpace;
  
    Output.Position = mul(vPos, g_mWorldViewProjection);
    vNormalWorldSpace = normalize(mul(vNormal, (float3x3)g_mWorld));
    
    float3 vTotalLightDiffuse = float3(0,0,0);
    vTotalLightDiffuse += g_LightDiffuse * max(0,dot(vNormalWorldSpace, g_LightDir));
        
    Output.Diffuse.rgb = g_MaterialDiffuseColor * vTotalLightDiffuse + 
                         g_MaterialAmbientColor * g_LightAmbient;   
    Output.Diffuse.a = 1.0f; 
    Output.TextureUV = vTexCoord0; 
    
    return Output;    
}

struct PS_OUTPUT
{
    float4 RGBColor : SV_Target;  // Pixel color
};


PS_OUTPUT RenderScenePS( VS_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor = g_Tex0.Sample(MeshTextureSampler, In.TextureUV) * In.Diffuse;
    return Output;
}

/////////////////////////////////////////////////////////////////////

struct VS_FSQUAD_OUTPUT
{
    float4 Position   : SV_POSITION; 
    float2 TextureUV  : TEXCOORD0;
};


VS_FSQUAD_OUTPUT RenderFSQuadVS(float4 vPos : POSITION,
                                float2 vTexCoord0 : TEXCOORD)
{
    VS_FSQUAD_OUTPUT Output;
    Output.Position = float4(vPos.xy, 0.f, 1.f);
    Output.TextureUV = vTexCoord0; 
    return Output;    
}


PS_OUTPUT RenderFSQuadPS( VS_FSQUAD_OUTPUT In ) 
{ 
    PS_OUTPUT Output;
    Output.RGBColor = g_InputTexture.Sample(MeshTextureSampler, In.TextureUV);
    Output.RGBColor.rgb *= fmod(g_fTime, 3.f);
    return Output;
}

/////////////////////////////////////////////////////////////////////


technique11 RenderSceneWithTexture1Light
{
    pass FillTexture
    {
        SetRenderTargets( g_Rtv0, NULL );
        SetDepthStencilState( NoDepth, 0 );

        /// .... 
        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderFSQuadVS( ) ) );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderFSQuadPS(  ) ) );
    }

    pass Main
    {
        SetVertexShader( CompileShader( vs_4_0_level_9_1, RenderSceneVS( ) ) );
        SetGeometryShader( NULL );
        SetPixelShader( CompileShader( ps_4_0_level_9_1, RenderScenePS(  ) ) );

        SetDepthStencilState( EnableDepth, 0 );
    }
}

