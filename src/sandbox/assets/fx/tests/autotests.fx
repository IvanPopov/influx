/**
 * @autotests
 * General shader language bytecode tests.
 */


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

// /**
//  * @test Postfix index calculation (registers)
//  * @expected {main() == 2}
//  */
// int main()
// {
//     float4 x = float4(4.4f,3.3f,2.2f,1.1f);
//     return (int)(x[2]);
// }