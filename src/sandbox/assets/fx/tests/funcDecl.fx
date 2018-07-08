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