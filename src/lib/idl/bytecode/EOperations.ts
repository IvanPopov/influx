export enum EOperation {
    // note: assuming that Load is 32bit and Move is 32bit too
    k_I32LoadRegister,          // registers => registers
    k_I32LoadInput,             // input => registers
    
    k_I32LoadInputPointer,      // input pointer => register
    k_I32LoadRegistersPointer,  // register pointer => register
    
    k_I32StoreRegisterPointer,  // register => register pointer
    
    k_I32StoreInput,            // registers => input
    k_I32StoreInputPointer,     // register => input pointer
    
    k_I32SetConst,              // set constant => registers

    //
    // Arithemtic operations
    //

    k_I32Add,
    k_I32Sub,
    k_I32Mul,
    k_I32Div,

    k_F32Add,
    k_F32Sub,
    k_F32Mul,
    k_F32Div,

    //
    // Relational operations
    //

    k_U32LessThan,
    k_U32GreaterThanEqual,
    k_I32LessThan,
    k_I32GreaterThanEqual, 
    k_I32Equal,
    k_I32NotEqual,
    k_F32LessThan,
    k_F32GreaterThanEqual,

    //
    // Logical operations
    //

    k_I32LogicalOr,
    k_I32LogicalAnd,

    //
    // intrinsics
    //

    k_F32Frac,
    k_F32Floor,
    k_F32Sin,
    k_F32Cos,
    k_F32Abs,
    k_F32Sqrt,
    k_F32Max,
    k_F32Min,
    
    k_I32Mad,
    
    // 
    // Cast operations
    //

    k_F32ToU32,
    k_F32ToI32,
    k_U32ToF32,
    k_I32ToF32,

    //
    // Flow control
    //

    k_Jump,
    k_JumpIf,

    // the operation is only necessary to maintain the purity of the code, 
    // when generating the code will be replaced by a jump for all 
    // functions except entry point;
    k_Ret
};