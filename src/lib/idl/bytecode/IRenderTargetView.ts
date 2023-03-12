export enum ERenderTargetFormats {
    k_rgba8,
    k_rgba32
}

export interface IRenderTargetView {
    name: string;
    texture: string;
    format: ERenderTargetFormats;
}
