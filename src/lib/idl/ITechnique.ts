export interface ITechniqueRenderPass {
    
}

export interface ITechnique<PASS_T = ITechniqueRenderPass> {
    getName(): string;
    getType(): 'emitter' | 'material' | 'technique11';

    getPassCount(): number;
    getPass(i: number): PASS_T;
}
