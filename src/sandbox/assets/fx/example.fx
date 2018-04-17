
/* strict mode (optional, not a part of core HLSL grammar) */
use strict;


/* simple provide decl */
provide namespace;

/**
 * complex provide decl 
 * (used as override for decl above)
 */
provide common.example;


/* technique with annotation */
technique T1 <int x = 1;> {

}

/** 
 * technique with semantics 
 * (semantics is optional, it's not a part of HLSL core grammar)
 */
technique T2 : SOME_SEMANTICS {
    /* named pass */
    pass p0 {
        
    }
    
    /* unnamed pass */
    pass  {
        
    }
}

/* technique with annotation and semantics */
technique T3 : SOME_SEMANTICS <int x = 1;> {

}


include "include.fx";
