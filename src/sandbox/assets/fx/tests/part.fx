
struct Part {
    float x;
    float y;
    float z;
    float size;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float x;
    float y;
    float z;
    float4 color : COLOR0;
    float  size : SIZE;
};


int summ(int a, int b) { return a + b; }
int spawn()
{
    return summ(1,2);
}

void init(out Part part)
{
    part.x = 0.0;
    part.y = 0.0;
    part.z = 0.0;
    part.size = 0.1;
}

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    float y = part.y;
    y = y + 0.01;
    part.y = y;
    return true;
}

void prerender(inout Part part, out DefaultShaderInput input)
{
    // input.pos = part.pos;
    input.x = part.x;
    input.y = part.y;
    input.z = part.z;
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