export enum ETextureFilters {
    UNDEF = 0x0000,
    NEAREST = 0x2600,
    LINEAR = 0x2601,
    NEAREST_MIPMAP_NEAREST = 0x2700,
    LINEAR_MIPMAP_NEAREST = 0x2701,
    NEAREST_MIPMAP_LINEAR = 0x2702,
    LINEAR_MIPMAP_LINEAR = 0x2703
}

export enum ETextureWrapModes {
    UNDEF = 0x0000,
    REPEAT = 0x2901,
    CLAMP_TO_EDGE = 0x812F,
    MIRRORED_REPEAT = 0x8370
}

export enum ETextureParameters {
    MAG_FILTER = 0x2800,
    MIN_FILTER,
    WRAP_S,
    WRAP_T
}

export enum ETextureTypes {
    TEXTURE_2D = 0x0DE1,
    TEXTURE_CUBE_MAP = 0x8513,
}

export enum ECubeFace {
    POSITIVE_X = 0,
    NEGATIVE_X = 1,
    POSITIVE_Y = 2,
    NEGATIVE_Y = 3,
    POSITIVE_Z = 4,
    NEGATIVE_Z = 5,
}

export enum ETextureCubeFlags {
    POSITIVE_X = 0x00000001,
    NEGATIVE_X = 0x00000002,
    POSITIVE_Y = 0x00000004,
    NEGATIVE_Y = 0x00000008,
    POSITIVE_Z = 0x0000000c,
    NEGATIVE_Z = 0x000000010,
}

export enum ETextureUnits {
    TEXTURE0 = 0x84C0
}


