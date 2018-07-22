
int test_a (in int a)
{
    int b: SOME = a + 1, c, d[2] = { 0, 1 };
    return b;
}


int test_b ()
{
    int a = 1, c = 0;
    a = 2;
    {
        int b = a + 1;
        int a = 2 * b;
        c = a;
    }

    a++;
    return a * c * a;
}