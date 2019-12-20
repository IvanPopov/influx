export { EOperation } from "./EOperations"

export enum EAddrType {
    k_Registers,
    k_Input,
    k_Constants,
    
    k_PointerRegisters,
    k_PointerInput,
    k_PointerConstants
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

