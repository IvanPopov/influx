#define MACRO_0
#define MACRO_1
#define MACRO_2

#ifdef (MACRO_3 || (MACRO_2 && MACRO_1))
int x = 1;
#endif

#ifdef !MACRO_2 || MACRO_UNKNOWN
bla bla bla...
#endif

#define MACRO_REDEF
#define MACRO_REDEF

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