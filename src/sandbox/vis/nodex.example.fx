provide s3d.part

// @usage PS
// @param {base} Input color.
// @label VertexLighting
void VertexLightingPS (in float3 diffuseLighting, in float4 base, out float4 color) {
    color = base * diffuseLighting;
}

// @usage VS
void VertexLightingVS (in float3 wpos, in float3 wview, in float viewZ, out color4 diffuseLighting)
{
    // todo
    diffuseLighting = 1.f;
}