
/* strict mode (optional, not a part of core HLSL grammar) */
use strict;


/* simple provide decl */
provide namespace;

/**
 * complex provide decl 
 * (used as override for decl above)
 */
provide common.example;


/**
 * Global variables
 */
float4 g_MaterialAmbientColor;      // Material's ambient color
float4 g_MaterialDiffuseColor;      // Material's diffuse color
float3 g_LightDir;                  // Light's direction in world space
float4 g_LightDiffuse;              // Light's diffuse color
texture g_MeshTexture;              // Color texture for mesh

float    g_fTime;                   // App's time in seconds
float4x4 g_mWorld;                  // World matrix for object
float4x4 g_mWorldViewProjection;    // World * View * Projection matrix



/**
 * Texture samplers
 */
sampler MeshTextureSampler = 
sampler_state
{
    Texture = <g_MeshTexture>;
    MipFilter = LINEAR;
    MinFilter = LINEAR;
    MagFilter = LINEAR;
};


/**
 * Vertex shader output structure
 */
struct VS_OUTPUT
{
    float4 Position   : POSITION;   // vertex position 
    float4 Diffuse    : COLOR0;     // vertex diffuse color (note that COLOR0 is clamped from 0..1)
    float2 TextureUV  : TEXCOORD0;  // vertex texture coords 
};


/* technique with annotation */
technique T1 <int x = 1;> {

}

/** 
 * technique with semantics 
 * (semantics is optional, it's not a part of HLSL core grammar)
 */
technique T2 : SOME_SEMANTICS {
    /* named pass */
    pass p0 {
        
    }
    
    /* unnamed pass */
    pass  {
        
    }
}

/* technique with annotation and semantics */
technique T3 : SOME_SEMANTICS <int x = 1;> {

}


include "include.fx";
