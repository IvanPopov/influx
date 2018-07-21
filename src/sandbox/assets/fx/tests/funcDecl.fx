int func_a()
{
    // errror: invalid return type
    return;
}


void func_b() {
    // errror: invalid return type
    return 1;
}

void func_c() {}
// error: function redifinition
void func_c() {}

float func_d();
// error: invalid function implementation
int func_d() {}

// error: return statement expected
int func_e() {}


float fmod(float a, float b)
{
    return (a - b * floor(a / b));
}


int inc(inout int src, int count = 1)
{
    src += count;
    return src;
}


void copy_ival(in int src, out int dst)
{
    dst = src;
    return;
    // error: unreachable code
    dst = 5;
}