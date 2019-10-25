export { EOperation } from "./EOperations"

export enum EMemoryLocation {
    k_Registers,
    k_Input,
    k_Constants
};

export enum EChunkType {
    k_Constants,
    k_Layout,
    k_Code,
};

export interface IMemoryRecord {
    range: number;
    value: number | string;
    type: 'f32' | 'i32' | 'uniform' | 'unknown';
}

