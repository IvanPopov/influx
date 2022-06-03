import { EPartFxPassGeometry, IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { Vector3 } from 'three';


export interface IAttribute {
    size: number;
    offset: number;
    name: string;
}


export interface IPass {
    instanceLayout: IAttribute[];
    geometry: string;
    data: Uint8Array;
    sorting: boolean;

    // number of float elements in the prerendered particle (src)
    stride: number;

    // GLSL shader's sources
    vertexShader: string;
    pixelShader: string;

    // num alive particles multipled by the prerendered instance count
    length(): number;
    sort(pos: Vector3): void;
}


export interface IEmitter {
    name: string;
    capacity: number;
    passes: IPass[];

    start(): void;
    stop(): void;
    tick(): void;
    isStopped(): boolean;
    length(): number;

    reset(): void;
    // shadowReload(fx: IPartFxInstruction): Promise<boolean>;
    shadowReload(fx: any): Promise<boolean>;
    
    dump(): void;

    destroy(): void;
}
