
struct Part {
    float3 pos;
    float size;
};

/* Example of default shader input. */
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};

float4 foo() {
    float4 x = float4(10.f);
    return float4(x.ab, x.rr);
}


int summ(int a, int b) { return a + b; }
int spawn()
{
    return summ(1,0);
}

void init(out Part part)
{
    part.pos = float3(float2(0.0).xx, 0.0);
    part.size = 0.1;
}

uniform float elapsedTime: ELAPSED_TIME;
uniform float unknownGlobal;

/** Return false if you want to kill particle. */
bool update(inout Part part)
{
    float y = part.pos.y;
    y = y + 1.0f * elapsedTime + 0.f * unknownGlobal;
    part.pos.y = y;
    return true;
}

void prerender(inout Part part, out DefaultShaderInput input)
{
    // input.pos = part.pos;
    input.pos.xyz = part.pos.xyz;
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