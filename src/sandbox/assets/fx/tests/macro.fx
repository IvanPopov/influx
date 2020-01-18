#define MACRO_0
#define MACRO_1
#define MACRO_2

#ifdef (MACRO_3 || (MACRO_2 && MACRO_1))
int x = 1;
#endif

#ifdef !MACRO_2 || MACRO_UNKNOWN
bla bla bla...
#endif

#if MACRO_7 == 1
    // ...
#endif

#if 1
bool b = false;
#endif

#if 1 + 2 * 3 + defined(MACRO_1)
bool c = false;
#else
foo :/
#endif

#define MACRO_5 0

#if MACRO_5 == 1
    float f = 10.f;
#elif MACRO_5 == 0
    float f = 0.f;
#endif

#define MACRO_REDEF
#define MACRO_REDEF

#define A 10
#define B 20

#define MUL(A, B) A * B
#define ADD(A, B) (A + B)

#if ADD(2, ADD(2, 3)) > 6
    float f2 = -1.f;
#endif

#if MUL(3, ADD(2, 3))
uint u = 10u;
#endif

AppendStructuredBuffer<float> uav0;
void main() {
    max(1, 2);
    uav0.Append(1.f);
}


#pragma warning(disable : 5206) // local variable 'closestIdx' is unreferenced
#pragma warning(disable : 5557) // vector or matrix accessed with dynamic index, user is responsible for ensuring that index is within bounds.
#pragma warning(disable : 5581) // target architecture treats 'half' type as full-precision
#pragma warning(disable : 5524) // unsupported compiler hint
