/**
 * @autotests
 * General shader language bytecode tests.
 */

/**
 * @test Less than equal test (int);
 * @expected {lessThanEqual_int(-1, 1) == true}
 * @expected {lessThanEqual_int(1, -1) == false}
 * @expected {lessThanEqual_int(0, 0) == true}
 */
bool lessThanEqual_int(int x, int y)
{
    return x <= y;
}


/**
 * @test Less than equal test (uint);
 * @expected {lessThanEqual_uint(-1, 1) == false}
 * @expected {lessThanEqual_uint(1, -1) == true}
 * @expected {lessThanEqual_uint(0, 0) == true}
 */
bool lessThanEqual_uint(uint x, uint y)
{
    return x <= y;
}

/**
 * @test Vector ctor test.
 * @expected {vector_ctor_test2() == true}
 */
bool vector_ctor_test2(void)
{
    float4 v = float4(1.f);
    return v.r == 1.f;
}

/**
 * @test Vector ctor test.
 * @expected {vector_ctor_test1() == true}
 */
bool vector_ctor_test1(void)
{
    float4 v = float4(1.f, float3(2.f, float2(3.f, 4.f)));
    return v.x == 1.f && v.y == 2.f && v.z == 3.f && v.w == 4.f;
}

/**
 * @test If statement test.
 * @expected {if_statement_test(true) == 10}
 * @expected {if_statement_test(false) == 30}
 * @expected {if_statement_test(false, true) == 20}
 */
int if_statement_test(bool cond1, bool cond2 = false)
{
    if (cond1) {
        return 10;
    } 
    else if (cond2) {
        return 20;
    }
    return 30;
}

/**
 * @test Postfix index getter (registers)
 * @expected {postfix_index_getter() == 2}
 */
int postfix_index_getter()
{
    float4 x = float4(4.4f,3.3f,2.2f,1.1f);
    return (int)(x[2]);
}


/**
 * @test Postfix index getter swizzled (registers)
 * @expected {postfix_index_getter_swizzled() == 3}
 */
int postfix_index_getter_swizzled()
{
    float2 x[2];
    x[1] = float2(2.2f, 1.1f);
    x[0] = float2(4.4f, 3.3f);
    return (int)x[0].y;
}


/**
 * @test Postfix index setter (registers)
 * @expected {postfix_index_setter() == -2}
 */
int postfix_index_setter()
{
    int x[5];
    x[2] = -2;
    return x[2];
}

/**
 * @test Postfix index setter swizzled (registers)
 * @expected {postfix_index_setter_swizzled() == true}
 */
bool postfix_index_setter_swizzled()
{
    float3 x[5];
    x[2].zyx = float3(-1.f, -2.f, -3.f);
    return x[2].x == -3.f && x[2].y == -2.f && x[2].z == -1.f;
}


/**
 * @test Prefix increment test (integers)
 * @expected {prefix_inc_int_test() == true}
 */
bool prefix_inc_int_test(void) {
    int i = 10;
    int j = ++i;
    return j == i;
}


/**
 * @test Postfix increment test (integers)
 * @expected {postfix_inc_int_test() == true}
 */
bool postfix_inc_int_test(void) {
    int i = -10;
    int j = i--;
    return j - 1 == i;
}


/**
 * @test Prefix increment test (floats)
 * @expected {prefix_inc_float_test() == true}
 */
bool prefix_inc_float_test(void) {
    float i = 10.f;
    float j = ++i;
    return j == i;
}


/**
 * @test Postfix increment test (floats)
 * @expected {postfix_inc_float_test() == true}
 */
bool postfix_inc_float_test(void) {
    float i = -10.f;
    float j = i--;
    return j - 1.f == i;
}

/**
 * @test For loop test 1.
 * @expected {for_loop_test1() == 10}
 */
int for_loop_test1() {
    int x;
    for (int i = 0; i < 11; i++) {
        x = i;
    }
    return x;
}


/**
 * @test "dot" intrinsic test for float4 vectors.
 * @expected {dot4_test() == true}
 */
bool dot4_test() {
    return (int)dot(float4(1.f, 2.f, 3.f, 4.f), float4(5.f, 6.f, 7.f, 8.f)) == 70;
}

// float equals
bool feq(float a, float b)
{
    return abs(a - b) < 0.00001f;
}

/**
 * @test "lerp" intrinsic test for float4 vectors and float koeff.
 * @expected {lerp_float() == true}
 */
bool lerp_float() {
    float4 res = lerp(float4(1.f, 2.f, 3.f, 4.f), float4(4.f, 3.f, 2.f, 1.f), 1.f);
    return feq(res.x, 4.f) && feq(res.y, 3.f) && feq(res.z, 2.f) && feq(res.w, 1.f);
}


/**
 * @test "lerp" intrinsic test for float4 vectors and float koeff inv.
 * @expected {lerp_float_inv() == true}
 */
bool lerp_float_inv() {
    float4 res = lerp(float4(1.f, 2.f, 3.f, 4.f), float4(4.f, 3.f, 2.f, 1.f), 0.f);
    return feq(res.a, 4.f) && feq(res.b, 3.f) && feq(res.g, 2.f) && feq(res.r, 1.f);
}


/**
 * @test "lerp" intrinsic test for float4 vectors and float koeff half.
 * @expected {lerp_float_half() == true}
 */
bool lerp_float_half() {
    float4 res = lerp(float4(1.f, 2.f, 3.f, 4.f), float4(4.f, 3.f, 2.f, 1.f), 0.5f);
    return feq(res.x, 2.5f) && feq(res.y, 2.5f) && feq(res.z, 2.5f) && feq(res.w, 2.5f);
}


/**
 * @test "lerp" intrinsic test for float4 vectors and float4 koeff half.
 * @expected {lerp_float4_half() == true}
 */
bool lerp_float4_half() {
    float4 res = lerp(float4(1.f, 2.f, 3.f, 4.f), float4(4.f, 3.f, 2.f, 1.f), float4(0.f, 1.f, 0.5f, 0.5f));
    return feq(res.x, 1.f) && feq(res.y, 3.f) && feq(res.z, 2.5f) && feq(res.w, 2.5f);
}

/**
 * @test Swizzle test 1.
 * @expected {swizzle_test_1() == true}
 */
bool swizzle_test_1() 
{
    float4 v4 = float4(1.f, 2.f, 3.f, 4.f);
    return feq(v4.wzyx.xyzw.wzyx.x, 1.f) && feq(v4.wzyx.xyzw.wzyx.y, 2.f);
}

struct T_1 {
    float4 v4;
    uint2 u2;
    int2 arr[5];
    int i;
};

/**
 * @test Pointer writing test.
 * @expected {pointer_writing_test() == true}
 */
bool pointer_writing_test() 
{
    T_1 t[10];
    t[7].v4 = float4(1.f, 2.f, 3.f, 4.f);
    return feq(t[7].v4.y, 2.f);
}

/**
 * @test Swizzled pointer writing test.
 * @expected {swizzled_pointer_writing_test() == true}
 */
bool swizzled_pointer_writing_test() 
{
    T_1 t;
    t.v4.abgr[1] = 10.f;
    return feq(t.v4.z, 10.f);
}

/**
 * @test Swizzled pointer writing test (pointer of pointer).
 * @expected {swizzled_pointer_writing_test2() == true}
 */
bool swizzled_pointer_writing_test2() {
    T_1 t[3];
    t[2].arr[3].y = 99;
    return t[2].arr[3].y == 99;
}
