/**
 * @autotests
 * General shader language bytecode tests.
 */

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
 * @test Postfix index setter (registers)
 * @expected {postfix_index_setter() == -2}
 */
int postfix_index_setter()
{
    int x[5];
    x[2] = -2;
    return x[2];
}