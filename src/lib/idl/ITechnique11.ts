
// export interface IAttribute {
//     size: number;
//     offset: number;
//     name: string;
// }

import { ITechnique } from "./ITechnique";


// export enum EUsage {
//     k_Vertex = 0x01,
//     k_Pixel = 0x02,
//     k_Compute = 0x04
// };


// export interface IConstanBufferField {
//     name: string;
//     semantic: string;
//     size: number;
//     padding: number;
//     length: number;
// }


// export interface IConstantBuffer {
//     slot: number;
//     name: string;
//     size: number;
//     usage: number;
//     fields: IConstanBufferField[];
// }



export interface ITechnique11RenderPass {
    // instanceName: string;
    // instanceLayout: IAttribute[];
    // stride: number; // number of float elements in the prerendered particle (src)

    // // GLSL shader's sources
    // vertexShader: string;
    // pixelShader: string;

    // cbuffers: IConstantBuffer[];
}


export interface ITechnique11 extends ITechnique<ITechnique11RenderPass> {
    getName(): string;
    getPassCount(): number;
    getPass(i: number): ITechnique11RenderPass;
}
