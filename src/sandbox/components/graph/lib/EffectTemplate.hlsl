/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};


void PrerenderRoutine(inout Part part, out DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = part.size;
    input.color = float4(abs(part.speed), 1.0f - part.timelife);
}


partFx example {
    Capacity = 1000;
    SpawnRoutine = compile SpawnRoutine();
    InitRoutine = compile InitRoutine();
    UpdateRoutine = compile UpdateRoutine();

    pass P0 {
        Sorting = TRUE;
        PrerenderRoutine = compile PrerenderRoutine();
    }
}

