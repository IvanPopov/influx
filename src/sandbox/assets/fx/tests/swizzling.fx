float4 foo() {
    float4 x = float4(10.f);
    return float4(float2(16.f, 32.f).yx, x.rr);
}
  