export enum EEffectErrors {
    REDEFINE_SYSTEM_TYPE = 2201,
    REDEFINE_TYPE = 2202,
    REDEFINE_VARIABLE = 2234,
    REDEFINE_SYSTEM_VARIABLE = 2235,
    REDEFINE_FUNCTION = 2236,
    REDEFINE_SYSTEM_FUNCTION = 2237,

    UNSUPPORTED_TYPEDECL = 2203,
    UNSUPPORTED_EXPR = 2204,
    UNKNOWN_VARNAME = 2205,
    BAD_ARITHMETIC_OPERATION = 2206,
    BAD_ARITHMETIC_ASSIGNMENT_OPERATION = 2207,
    BAD_ASSIGNMENT_OPERATION = 2208,
    BAD_RELATIONAL_OPERATION = 2209,
    BAD_LOGICAL_OPERATION = 2210,
    BAD_CONDITION_TYPE = 2211,
    BAD_CONDITION_VALUE_TYPES = 2212,
    BAD_CAST_TYPE_USAGE = 2213,
    BAD_CAST_TYPE_NOT_BASE = 2214,
    BAD_CAST_UNKNOWN_TYPE = 2215,
    BAD_UNARY_OPERATION = 2216,
    BAD_POSTIX_NOT_ARRAY = 2217,
    BAD_POSTIX_NOT_INT_INDEX = 2218,
    BAD_POSTIX_NOT_FIELD = 2219,
    BAD_POSTIX_NOT_POINTER = 2220,
    BAD_POSTIX_ARITHMETIC = 2221,
    BAD_PRIMARY_NOT_POINT = 2222,
    BAD_COMPLEX_NOT_FUNCTION = 2223,
    BAD_COMPLEX_NOT_TYPE = 2224,
    BAD_COMPLEX_NOT_CONSTRUCTOR = 2225,
    BAD_COMPILE_NOT_FUNCTION = 2226,
    BAD_REDEFINE_FUNCTION = 2227,
    BAD_WHILE_CONDITION = 2228,
    BAD_DO_WHILE_CONDITION = 2229,
    BAD_IF_CONDITION = 2230,
    BAD_FOR_INIT_EXPR = 2231,
    BAD_FOR_INIT_EMPTY_ITERATOR = 2232,
    BAD_FOR_COND_EMPTY = 2233,
    BAD_FOR_COND_RELATION = 2238,
    BAD_FOR_STEP_EMPTY = 2239,
    BAD_FOR_STEP_OPERATOR = 2240,
    BAD_FOR_STEP_EXPRESSION = 2241,
    BAD_NEW_FIELD_FOR_STRUCT_NAME = 2242,
    BAD_NEW_FIELD_FOR_STRUCT_SEMANTIC = 2243,
    BAD_NEW_ANNOTATION_VAR = 2244,
    BAD_FUNCTION_PARAMETER_DEFENITION_NEED_DEFAULT = 2245,
    BAD_CANNOT_CHOOSE_FUNCTION = 2246,
    BAD_FUNCTION_DEF_RETURN_TYPE = 2247,
    BAD_SYSTEM_FUNCTION_REDEFINE = 2248,
    BAD_SYSTEM_FUNCTION_RETURN_TYPE = 2249,
    BAD_TYPE_NAME_NOT_TYPE = 2250,
    BAD_TYPE_VECTOR_MATRIX = 2251,
    BAD_TECHNIQUE_REDEFINE_NAME = 2252,
    BAD_MEMOF_ARGUMENT = 2253,
    BAD_MEMOF_NO_BUFFER = 2254,
    BAD_FUNCTION_USAGE_RECURSION = 2255,
    BAD_FUNCTION_USAGE_BLACKLIST = 2256,
    BAD_FUNCTION_USAGE_VERTEX = 2257,
    BAD_FUNCTION_USAGE_PIXEL = 2258,
    BAD_FUNCTION_VERTEX_DEFENITION = 2259,
    BAD_FUNCTION_PIXEL_DEFENITION = 2260,
    BAD_RETURN_STMT_VOID = 2261,
    BAD_RETURN_STMT_EMPTY = 2262,
    BAD_RETURN_STMT_NOT_EQUAL_TYPES = 2263,
    BAD_RETURN_TYPE_FOR_FUNCTION = 2264,
    BAD_FUNCTION_PARAMETER_USAGE = 2265,
    BAD_OUT_VARIABLE_IN_FUNCTION = 2266,
    BAD_TYPE_FOR_WRITE = 2267,
    BAD_TYPE_FOR_READ = 2268,
    BAD_VARIABLE_INITIALIZER = 2269,
    NOT_SUPPORT_STATE_INDEX = 2270,
    BAD_TEXTURE_FOR_SAMLER = 2271,
    CANNOT_CALCULATE_PADDINGS = 2272,
    UNSUPPORTED_EXTRACT_BASE_TYPE = 2273,
    BAD_EXTRACTING = 2274,
    BAD_TECHNIQUE_IMPORT = 2275,
    BAD_USE_OF_ENGINE_VARIABLE = 2276,
    BAD_IMPORTED_COMPONENT_NOT_EXIST = 2277,
    CANNOT_ADD_SHARED_VARIABLE = 2278,
    BAD_FUNCTION_DONT_HAVE_RETURN_STMT = 2279
}

export enum EEffectTempErrors {
    BAD_ARRAY_OF_POINTERS = 2300,
    BAD_LOCAL_OF_SHADER_INPUT = 2301,
    BAD_LOCAL_OF_SHADER_OUTPUT = 2302,
    UNSUPPORTED_PROVIDE_AS = 2303
}
