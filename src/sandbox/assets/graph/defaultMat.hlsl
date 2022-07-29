#ifndef __DEFAULT_MAT_HLSL__
#define __DEFAULT_MAT_HLSL__

/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    float3 pos : POSITION;
    float4 color : COLOR0;
    float  size : SIZE;
};

#endif
