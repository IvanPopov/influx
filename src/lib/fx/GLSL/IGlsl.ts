export enum EGlslType {
    k_Float_f32,
    k_Int_i32,
    k_Vec2_f32,
    k_Vec3_f32,
    k_Vec4_f32,
    k_Struct
};


export class IGlslType {
    type: EGlslType;
    name?: string;
    length?: number;
    fields?: IGlslVariable[];
}

export enum EGlslVariableUsage {
    k_Uniform,
    k_Varying,
    k_Attribute,
    k_In,
    k_Out,
    k_Inout
}

export interface IGlslVariable {
    name: string;
    type: IGlslType;
    usages?: EGlslVariableUsage[];
}
