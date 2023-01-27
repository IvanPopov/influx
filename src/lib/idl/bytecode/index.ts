import { TypeLayoutT } from "../bundles/FxBundle_generated";

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
    k_Externs
};

export interface Constant
{
    name: string;
    size: number;
    offset: number;
    semantic: string;
    type: string;
}

export interface Extern
{
    id: number;
    name: string;
    ret: TypeLayoutT;
    params: TypeLayoutT[];
}

type error = 'error';

// abstract interface represents arbitrary memory region based on chosen VM backend
export interface IMemory
{
    [index: number]: error;
}

export interface Numthreads
{
    x: number;
    y: number;
    z: number;
};

export interface Numgroups
{
    x: number;
    y: number;
    z: number;
};


export interface IUAV
{
    name: string;
    // byte length of a single element
    elementSize: number;
    // number of elements
    length: number;
    // register specified in the shader
    register: number;
    // [ elements ]
    data: IMemory;
    // raw data [ counter, ...elements ]
    buffer: IMemory
    // input index for VM
    index: number;                              // << todo: remove (index = register + internal_uav_offset)
}

export interface IBundle 
{
    play(): Uint8Array;
    dispatch(numgroups: Numgroups, numthreads: Numthreads);

    setInput(slot: number, input: IMemory): void;
    getInput(slot: number): IMemory;
    setConstant(name: string, value: Uint8Array): boolean;

    setExtern(id: number, extern: any): void;

    getLayout(): Constant[];
    getExterns(): Extern[];
}
