/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    float3 pos : POSITION;
    float4 color : COLOR0;
    float  size : SIZE;
};


struct Part {
    float3 pos;
    float timelife;
};

int spawner() {
    return 1;
}

void init(out Part part, int partId)
{
    part.pos = float3(0.f, 0.f, 0.f);
    part.timelife = 0.f;
}

uniform float elapsedTime;

bool update(inout Part part) {
    part.pos = part.pos + float3(0.f, 1.f, 0.f) * elapsedTime; 
    part.timelife = part.timelife + elapsedTime;
    return part.timelife < 1.f;
}


void prerender(in Part part, out DefaultShaderInput input)
{
    input.pos = part.pos;
    input.color = float4(1.f, 0.f, 1.f, 1.f);
    input.size = 0.1f;
}

partFx example {
    Capacity = 10;
    InitRoutine = compile init();
    UpdateRoutine = compile update();
    SpawnRoutine = compile spawner();

    pass {
        PrerenderRoutine = compile prerender();
    }
}