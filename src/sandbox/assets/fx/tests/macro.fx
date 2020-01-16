#define MACRO_0

#ifdef MACRO_0
int x = 1;
#endif

#ifdef MACRO_UNKNOWN
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