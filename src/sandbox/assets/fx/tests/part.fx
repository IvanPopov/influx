
struct Part {
    float pos;
    float size;

    float3 _pad;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    float pos : POSITION;
    float size : SIZE;
    float color : COLOR0;
};


int spawn()
{
    return 1;
}

void init(out Part part)
{

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
    input.color = 0.0;
}

partFx project.awesome {
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