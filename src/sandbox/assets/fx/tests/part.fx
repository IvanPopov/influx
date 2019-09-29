
struct Part {
    float pos;
    float size;
};

struct DefaultView {
    float pos;
    float size;
    float color;
}

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

void prerender(inout Part part, out DefaultView view)
{
    view.pos = part.pos;
    view.size = part.size;
    view.color = 0;
}

part example {
    SpawnRoutine = compile spawn();
    InitRoutine = compile init();
    UpdateRoutine = compile update();

    pass P0 {
        Sorting = TRUE;
        DefaultRenderer = TRUE;
        PrerenderRoutine = compile prerender();
    }
}