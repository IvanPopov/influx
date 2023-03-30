#include "common.fx"

#define heightMap iChannel0
#define heightMapResolution iChannelResolution[0]
#define textureOffset 1.0
#define pixelToTexelRatio (iResolution.xy/heightMapResolution.xy)

float bnoise (float2 uv)
{
    return g_BlueNoise.Sample(SamplerLinear, uv).x * 2. - 1.;
}

float2 texNormalMap(in float2 uv, in Texture2D heightMap)
{
    float2 s = 1.0/Texture2DSize(heightMap).xy;
    
    float p = heightMap.Sample(SamplerLinear, uv).z;
    float h1 = heightMap.Sample(SamplerLinear, uv + s * float2(textureOffset,0)).z;
    float v1 = heightMap.Sample(SamplerLinear, uv + s * float2(0,textureOffset)).z;
       
   	return (p - float2(h1, v1));
}


void MainImage( out float4 fragColor, in float2 fragCoord, in Texture2D iChannel0, in Texture2D iChannel2)
{
    float2 res = iResolution.xy;
    float2 invres = 1.0/res; 
    float2 uv = fragCoord/res;
    uv = ((uv - 0.5) * (0.85 + sin(iTime*0.33) * 0.05)) + 0.5;
    float2 uvoffset = float2(sin(iTime * 0.2), cos(iTime * 0.4)) * 0.02;
    uvoffset += float2(cos(iTime * 0.5), sin(iTime * 0.3)) * 0.01;
    uv += uvoffset;
    float noise = bnoise(fragCoord / float2(1024.));
    float4 bufB = iChannel0.Sample(SamplerLinear, uv);
    bufB.xy *= -1.0;
   
    float2 bguv = ((fragCoord/res - 0.5) * 0.85  + 0.5) ;
    
    //setup passes
    
    float2 windowN = GROOVE * texNormalMap(uv, iChannel0) / (invres.x * 2000.) ;
    
    float3 drops = g_Background.SampleBias(SamplerLinear, bguv + bufB.xy * -.1 + windowN, BLUR).xyz; //drops on glass
    float3 hazyglass = multisample( g_Background, bguv  + windowN, BLUR * (1.- bufB.w ) * 5., GROOVE * (0.05 + 0.0006 * noise)).xyz; //hazy glass
    
    float spec = saturate( dot( normalize(float3( -float2(bufB.xy * -.1 + windowN)*10., 1.0)) , normalize(float3((uv-float2(sin(iTime*0.3)*2.+0.5,.2))*float2(1.0,0.5),1.)) ));
    spec = pow(smoothstep(0.9,1.,spec),bufB.w * 100. + 60.);
    spec *= bufB.w + 0.1;
    
    //hazyglass *= (1.0-smoothstep(0.3, 0.5, bufB.w)) * 0.2 + .8; //highlight streaks
    // fragColor = iChannel0.Sample(SamplerLinear, uv);
    // return;
    if ( !DEBUG ) //Output
    {
        float vignette = distance(fragCoord/res, float2(0.5)) * 2.0 + 0.5;
    	fragColor.rgb = pow( lerp(hazyglass, drops, smoothstep(0.8, 0.9, bufB.w) ), float3(1.2,1.3,2.5) * vignette  ) + spec*float3(0.5,0.,0.); //put passes together
    }
    else //Debug views
    {
        float time = frac(iTime * 0.25);
        if (time < 0.25)
        {
        	fragColor.rgb = buildnormalz(bufB.xy) * float3(0.5) + float3(0.5);
        }
        else if (time < 0.5)
        {
            fragColor.rgb = buildnormalz(iChannel2.Sample(SamplerLinear, uv).xy) * float3(0.5) + float3(0.5);
        }
        else if (time < 0.75)
        {
			fragColor.rgb = float3(bufB.w);
        }
        else
        {
            fragColor.rgb = float3(iChannel2.Sample(SamplerLinear, uv).w);        
        }      
    }
    //fragColor.rgb = float3(spec);
    
}