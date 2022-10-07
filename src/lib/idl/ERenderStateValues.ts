
export enum ERenderStateValues {
    UNDEF = 0,

    TRUE,
    FALSE,

    ZERO,
    ONE,
    SRCCOLOR,
    INVSRCCOLOR,
    SRCALPHA,
    INVSRCALPHA,
    DESTALPHA,
    INVDESTALPHA,
    DESTCOLOR,
    INVDESTCOLOR,
    SRCALPHASAT,

    NONE,
    CW,
    CCW,
    FRONT,
    BACK,
    FRONT_AND_BACK,

    NEVER,
    LESS,
    EQUAL,
    LESSEQUAL,
    GREATER,
    NOTEQUAL,
    GREATEREQUAL,
    ALWAYS,

    FUNCADD,
    FUNCSUBTRACT,
    FUNCREVERSESUBTRACT,

    // HACK: temp hack
    LINELIST,
    LINESTRIP,
    TRIANGLELIST,
    TRAINGLESTRIP,
    POINTLIST
}
/*
//
//
//

export enum BLEND {
    ZERO = 1,
    ONE = 2,
    SRC_COLOR = 3,
    INV_SRC_COLOR = 4,
    SRC_ALPHA = 5,
    INV_SRC_ALPHA = 6,
    DEST_ALPHA = 7,
    INV_DEST_ALPHA = 8,
    DEST_COLOR = 9,
    INV_DEST_COLOR = 10,
    SRC_ALPHA_SAT = 11,
    BLEND_FACTOR = 14,
    INV_BLEND_FACTOR = 15,
    SRC1_COLOR = 16,
    INV_SRC1_COLOR = 17,
    SRC1_ALPHA = 18,
    INV_SRC1_ALPHA = 19
};


export enum BLEND_OP {
    ADD = 1,
    SUBTRACT = 2,
    REV_SUBTRACT = 3,
    MIN = 4,
    MAX = 5
};


export class RENDER_TARGET_BLEND_DESC {
    BlendEnable: boolean;
    SrcBlend: BLEND;
    DestBlend: BLEND;
    BlendOp: BLEND_OP;
    SrcBlendAlpha: BLEND;
    DestBlendAlpha: BLEND;
    BlendOpAlpha: BLEND_OP;
    RenderTargetWriteMask: number;
};


//
//
//

export enum DEPTH_WRITE_MASK {
    ZERO = 0,
    ALL = 1
};


export enum COMPARISON_FUNC {
    NEVER = 1,
    LESS = 2,
    EQUAL = 3,
    LESS_EQUAL = 4,
    GREATER = 5,
    NOT_EQUAL = 6,
    GREATER_EQUAL = 7,
    ALWAYS = 8
};


export enum STENCIL_OP {
    KEEP = 1,
    ZERO = 2,
    REPLACE = 3,
    INCR_SAT = 4,
    DECR_SAT = 5,
    INVERT = 6,
    INCR = 7,
    DECR = 8
};


export class DEPTH_STENCILOP_DESC {
    StencilFailOp: STENCIL_OP;
    StencilDepthFailOp: STENCIL_OP;
    StencilPassOp: STENCIL_OP;
    StencilFunc: COMPARISON_FUNC;
};

//
//
//

export enum PRIMITIVE_TOPOLOGY {
    UNDEFINED = 0,
    POINTLIST = 1,
    LINELIST = 2,
    LINESTRIP = 3,
    TRIANGLELIST = 4,
    TRIANGLESTRIP = 5,
    LINELIST_ADJ = 10,
    LINESTRIP_ADJ = 11,
    TRIANGLELIST_ADJ = 12,
    TRIANGLESTRIP_ADJ = 13
};

//
//
//

enum CULL_MODE {
    NONE = 1,
    FRONT = 2,
    BACK = 3,
    // ?
    FRONT_AND_BACK = 4
};


enum FILL_MODE {
    WIREFRAME = 2,
    SOLID = 3
};


class RASTERIZER_DESC {
    FillMode: FILL_MODE;
    CullMode: CULL_MODE;
    FrontCounterClockwise: boolean;
    DepthBias: number;
    DepthBiasClamp: number;
    SlopeScaledDepthBias: number;
    DepthClipEnable: boolean;
    ScissorEnable: boolean;
    MultisampleEnable: boolean;
    AntialiasedLineEnable: boolean;
}
*/
