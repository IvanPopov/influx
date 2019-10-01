
struct Part {
    float pos;
    float size;
};

struct DefaultShaderInput {
    float pos;
    float size;
    float color;
};

int spawn()
{
    return 0;
}

void init(out Part part)
{

}

void update(inout Part part)
{

}

void prerender(inout Part part, out DefaultShaderInput input)
{
    input.pos = part.pos;
    input.size = part.size;
    input.color = 0.0;
}

partFx awesome {
    SpawnRoutine = compile spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        DefaultShader = TRUE;
        PrerenderRoutine = compile prerender();
    }
}