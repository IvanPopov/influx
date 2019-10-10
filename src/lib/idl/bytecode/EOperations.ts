export enum EOperation {
    // note: assuming that Load is 32bit and Move is 32bit too
    k_LoadConst,
    k_LoadInput,

    k_I32MoveRegToReg,

    k_I32Add,
    k_I32Sub,
    k_I32Mul,
    k_I32Div,

    k_F32Add,
    k_F32Sub,
    k_F32Mul,
    k_F32Div,

    k_F32ToI32,
    k_I32ToF32,

    k_Ret
};