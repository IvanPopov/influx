
int main(void) {
    float a = 2.2;
    float b = 3.9;
    int c = (int)(a + b);
    return c;
}

technique some : semantic <int a=1;> {
    pass p0 <int b = 10;> {
        //SetComputeShader( CompileShader( cs_5_0, CS() ) );
        some = false;
    }
}
