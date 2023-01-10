#ifndef __SEQ_HLSL__
#define __SEQ_HLSL__

// custom sampler states are not supported for now (!)
SamplerState SequenceDefaultSampler;
//{
    //Filter = MIN_MAG_MIP_LINEAR;
    //AddressU = Wrap;
    //AddressV = Wrap;
//};

struct SequenceDesc
{
    uint frameX;
    uint frameLast;
    float frame;
};

/* Billboard layout:
 *
 * uv[0, 0]         uv[1, 0]
 *      (2) +-----+ (3)
 *          |     |
 *          |     |
 *      (0) +-----+ (1)
 * uv[0, 1]         uv[1, 1]
 */

float4 frameLow(SequenceDesc seq, Texture2D map, float2 uv) {
    uint frameY = seq.frameLast / seq.frameX + 1u;
    float2 tile = float2(1.f / float(seq.frameX), 1.f / float(frameY));

    float frame = clamp(seq.frame, 0.f, float(seq.frameLast));

    uint w, h;
    map.GetDimensions(0u, w, h);
    float2 texel = 1.f / float2(w, h);
    
    float2 pos = float2(floor(fmod(frame, float(seq.frameX))), floor(frame / float(seq.frameX)));
    pos.y = float(frameY) - 1.f - pos.y; // invert Y

    float2 uvTiled = clamp(uv * (tile - texel) + pos * tile + 0.5f * texel, 0.f, 1.f);
    return map.Sample(SequenceDefaultSampler, uvTiled);   
}

void wrap(inout SequenceDesc seq)
{
    seq.frame = fmod(seq.frame, float(seq.frameLast + 1u));
}

float4 frameLinear(SequenceDesc seq, Texture2D map, float2 uv)
{
    float4 a = frameLow(seq, map, uv);
    seq.frame += 1.f;
    float4 b = frameLow(seq, map, uv);
    return lerp(a, b, frac(seq.frame));
}

#endif