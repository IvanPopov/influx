
struct Part {
    float3 pos;
    float size;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    float3 pos : POSITION;
    float4 color : COLOR0;
    float  size : SIZE;
};


int spawn()
{
    return 1;
}

void init(out Part part)
{
    part.pos = float3(0);
    part.size = 0.1;
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    return true;
}

void prerender(inout Part part, out DefaultShaderInput input)
{
    input.pos = part.pos;
    input.size = part.size;
    input.color = float4(1.0, 0.0, 0.0, 1.0);
}

partFx project.awesome {
    Capacity = 100;
    SpawnRoutine = compile spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        DefaultShader = TRUE;
        PrerenderRoutine = compile prerender();
    }
}

partFx incomplete {

}