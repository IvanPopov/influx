#include "common.fx"

float2 WritePos (int i, float2 fragCoord, float2 res, float2 value)
{
    if (fragCoord.x == float(i))
    {
		return value;
    } 
    else {return float2(0);}
}

float WriteLife (int i, float2 fragCoord, float2 res, float value)
{
    if (fragCoord.x == float(i))
    {
		return value;
    } 
    else {return 0.;}
}

float LoadLife(in Texture2D iChannel0, int index) 
{ 
    return iChannel0.SampleBias( SamplerLinear, float2((float(index)+0.5) / Texture2DSize(iChannel0).x, 0.), -100.0 ).z; 
}

float4 LoadData(in Texture2D iChannel0, int index) 
{ 
    return iChannel0.SampleBias( SamplerLinear, float2((float(index)+0.5) / Texture2DSize(iChannel0).x, 0.), -100.0 ); 
}

void BufferA(out float4 fragColor, in float2 fragCoord, in Texture2D iChannel0)
{
    float2 res = iResolution.xy;
    float2 uv = fragCoord/res;
    float2 inv = float2(1., res.x / res.y); 
    
    float2 pos;
    float4 col;
    float radius = DROPSIZE * 0.005;
    float life01 = 1. / float(LIFETIME);
    float life;
    
    if (fragCoord.y < 2.) //update particle values (stored on 1st pixel row of buffer A)
    {
        for (int i = 0; i < COUNT-1; ++i)
        {
            float perinstancerandom = hash11(i);
            float perinstancelife = life01 * (perinstancerandom + 0.5);
            if (iFrame == 0u) //re-init particles
            {
                pos += WritePos(i, floor(fragCoord), res, hash21f(float(i) + iDate.x + iDate.y + iDate.z + iDate.w) ); //randomize position at index
                life += WriteLife(i, floor(fragCoord), res, perinstancerandom * 121.317 );

            }
            else //increment 
            {
                float rndgrav = -GRAVITY * pow( 0.7 + 0.3 * sin(perinstancerandom * 15. + iTime * 0.05), 2. );
                pos += WritePos(i, floor(fragCoord), res, (hash21(i*COUNT+int(iTime*60.)) * 2. - 1.) * DROPJITTER * inv * rndgrav + float2(0., rndgrav )   );
            	life += WriteLife(i, floor(fragCoord), res, life01 / abs(pos.y * 10.) * 0.01 );
            }
        }
        float vel = pos.y; 
        pos = frac(iChannel0.Sample(SamplerLinear, uv).xy + pos);
        life = frac(iChannel0.Sample(SamplerLinear, uv).z + life);
    	fragColor = float4(pos, life, vel);
    }
    else //draw results to buffer A
    {
        for (int i = 0; i < COUNT-1; ++i) 
        {
            float4 get = LoadData(iChannel0, i);
            float2 uvscale = (uv-get.xy) / float2(2,4) + get.xy; 
            float mask = 1. - saturate( (distance(get.xy, uvscale) / radius) );
            mask *= smoothstep( 0.9, 0.95, get.z);
            float2 normal = normalize(get.xy - uvscale) *(1. - mask)*ceil(mask);
            mask = ceil(mask);
            col.xy += normal;
            col.w = max(col.w,mask) ;
        }
        fragColor = col;  
    }
}