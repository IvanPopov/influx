export enum EOperation {
    // note: assuming that Load is 32bit and Move is 32bit too
    k_Load,              // load value from global memory;
    k_Move,

    k_IAdd,
    k_ISub,
    k_IMul,
    k_IDiv,

    k_FAdd,
    k_FSub,
    k_FMul,
    k_FDiv,

    k_FloatToInt,
    k_IntToFloat,

    k_Ret
};