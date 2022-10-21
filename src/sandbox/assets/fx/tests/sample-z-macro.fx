
#define _SAMPLE(tex, samp, uv)      tex.Sample(samp, uv)

float sample_z(Texture2D t, SamplerState s, float2 tex)
{
   float4 depth = _SAMPLE(t, s, tex);
   return depth.x;
}
