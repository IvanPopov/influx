import { IVariableDeclInstruction } from "./IInstruction";

export enum EShaderVariableType {
    k_NotVar = 0,

    k_Texture = 2,

    k_Float,
    k_Int,
    k_Bool,

    k_Float2,
    k_Int2,
    k_Bool2,

    k_Float3,
    k_Int3,
    k_Bool3,

    k_Float4,
    k_Int4,
    k_Bool4,

    k_Float2x2,
    k_Float3x3,
    k_Float4x4,

    k_Sampler2D,
    k_SamplerCUBE,
    k_SamplerVertexTexture,

    k_CustomSystem,
    k_Complex
}

export interface IShaderVarTypeMap {
    [index: number]: EShaderVariableType;
}

export interface IVariableInfo {
    variable: IVariableDeclInstruction;
    type: EShaderVariableType;
    name: string;
    isArray: boolean;
}

// export interface IVariableContainer {
//     getIndices(): number[];

//     add(pVar: IVariableDeclInstruction): void;
//     addSystemEntry(sName: string, eType: EShaderVariableType): void;

//     finalize(): void;

//     getVarInfoByIndex(iIndex: number): IVariableInfo;
//     getVarByIndex(iIndex: number): IVariableDeclInstruction;
//     getTypeByIndex(iIndex: number): EShaderVariableType;
//     isArrayVariable(iIndex: number): boolean;

//     getIndexByName(sName: string): number;

//     hasVariableWithName(sName: string): boolean;
//     hasVariableWithRealName(sName: string): boolean;

//     getVarByName(sName: string): IVariableDeclInstruction;
// }



