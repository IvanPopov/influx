export enum EUsage {
    k_Vertex = 0x01,
    k_Pixel = 0x02,
    k_Compute = 0x04
};


export interface IConstanBufferField {
    name: string;
    semantic: string;
    size: number;
    padding: number;
    length: number;
}


export interface IConstantBuffer {
    slot: number;
    name: string;
    size: number;
    usage: number;
    fields: IConstanBufferField[];
}


export interface ITexture {
    slot: number;
    name: string;
    usage: number;
    // todo: add more info
}


export interface ITechniqueRenderPass {
    
}

export interface ITechnique<PASS_T = ITechniqueRenderPass> {
    getName(): string;
    getType(): 'emitter' | 'material' | 'technique11';

    getPassCount(): number;
    getPass(i: number): PASS_T;
}
