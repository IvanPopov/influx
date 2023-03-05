import { IBundle } from "./bytecode";
import { ITechnique } from "./ITechnique";

import { PixelShaderT } from "./bundles/auto/fx/pixel-shader";
import { VertexShaderT } from "./bundles/auto/fx/vertex-shader";


export interface ITechnique11RenderPass {
    render: IBundle;
    // todo: do not use flatbuffers types (!)
    shaders: (PixelShaderT | VertexShaderT)[];
}


export interface ITechnique11 extends ITechnique<ITechnique11RenderPass> {
    getName(): string;
    getPassCount(): number;
    getPass(i: number): ITechnique11RenderPass;
}
