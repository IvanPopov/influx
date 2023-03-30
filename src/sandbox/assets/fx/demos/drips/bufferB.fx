#include "common.fx"

void BufferB( out float4 fragColor, in float2 fragCoord, in Texture2D iChannel0, in Texture2D iChannel1, in Texture2D iChannel2, in Texture2D iChannel3)
{
    float2 res = iResolution.xy;
    float2 uv = fragCoord/res;
    float2 inv = float2(1., res.y / res.x); 
    float4 bufA = multisample( iChannel0, uv, 0., 0.0005); //bufer A input
    float2 uvoffset = (iChannel2.Sample(SamplerLinear, uv * inv * 0.5).xy * 2. - 1.) * 0.00005; //distortion offset
    float4 bufB = multisample( iChannel1, uv + uvoffset, 0., 0.001); //history buffer
    float4 color = lerp( bufB * 0.98, bufA, bufA.w); //mix history buffer behind
    color.z = dot(iChannel3.Sample(SamplerLinear, uv * float2(9.0, 6.0)).xyz, float3(0.3,0.6,0.1)) * 0.5; //glass texture
    color.z += smoothstep(0.,1.0,abs(sin(uv.x * 120.0))) * 0.2;
    fragColor = color;
}
