
export interface IAttribute {
    size: number;
    offset: number;
    name: string;
}


export interface ITechniquePassDesc
{
    instanceName: string;
    instanceLayout: IAttribute[];
    stride: number; // number of float elements in the prerendered particle (src)

    // GLSL shader's sources
    vertexShader: string;
    pixelShader: string;
}

export interface ITechniquePass<DESC_T extends ITechniquePassDesc = ITechniquePassDesc> {
    getDesc(): DESC_T;
}


export interface ITechnique<PASS_T extends ITechniquePass = ITechniquePass> {
    getName(): string;
    getType(): 'emitter' | 'material';

    getPassCount(): number;
    getPass(i: number): PASS_T;
}
