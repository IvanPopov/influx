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

#define ADD(A, B) (A + B)

#if ADD(2, ADD(2, 3)) > 6
    float f2 = -1.f;
#endif

// #ifdef MACRO_0
//     // ...
// #else
//     // ...
// #endif

// #if true
//     // ...
// #endif

// #if false
//     // ...
// #endif

// #if true && false && true
//     // ...
// #endif

// #endif
;