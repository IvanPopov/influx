
export enum EDepthWriteMask {
    k_Zero = 0,
    k_All = 1
}

export enum EComparisonFunc {
    k_Never = 1,
    k_Less = 2,
    k_Equal = 3,
    k_LessEqual = 4,
    k_Greater = 5,
    k_NotEqual = 6,
    k_GreaterEqual = 7,
    k_Always = 8
}

export enum EStencilOp {
    k_Keep = 1,
    K_zero = 2,
    k_Replace = 3,
    k_IncrSat = 4,
    k_DecrSat = 5,
    k_Invert = 6,
    k_Incr = 7,
    k_Decr = 8
}

export interface DepthStencilOpDesc {
    StencilFailOp: EStencilOp;
    StencilDepthFailOp: EStencilOp;
    StencilPassOp: EStencilOp;
    StencilFunc: EComparisonFunc;
}

export interface IDepthStencilState {
    DepthEnable: boolean;
    DepthWriteMask: EDepthWriteMask;
    DepthFunc: EComparisonFunc;
    StencilEnable: boolean;
    StencilReadMask: number;
    StencilWriteMask: number;
    FrontFace: DepthStencilOpDesc;
    BackFace: DepthStencilOpDesc;
}


