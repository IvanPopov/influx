export { EOperation } from "./EOperations"

export enum EAddrType {
    k_Registers,
    k_Input,

    k_PointerRegisters,
    k_PointerInput
};

export enum EChunkType {
    k_Constants,
    k_Layout,
    k_Code,
};

// export interface IMemoryRecord {
//     range: number;
//     value: number | string;
//     type: 'f32' | 'i32' | 'uniform' | 'unknown';
// }

