export enum EOperation {
    // note: assuming that Load is 32bit and Move is 32bit too
    k_I32LoadRegister,          // registers => registers
    k_I32LoadInput,             // input memory => registers
    k_I32LoadConst,             // constant memory => registers
    
    k_I32LoadRegistersPointer,
    k_I32LoadInputPointer,
    k_I32LoadConstPointer,
    
    k_I32StoreInput,            // registers => input memory
    // k_I32StoreInputPointer   // 


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

    k_I32LessThan,
    k_I32GreaterThan,
    k_I32LessThanEqual,
    k_I32GreaterThanEqual,

    k_F32LessThan,
    k_F32GreaterThan,
    k_F32LessThanEqual,
    k_F32GreaterThanEqual,

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

    k_F32ToI32,
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