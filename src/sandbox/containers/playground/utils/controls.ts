import { ControlValueType } from "@lib/fx/bundles/utils";
import { Vector4, Vector3, Vector2, Color } from "@sandbox/store/IStoreState";
import * as THREE from 'three';
import { IResourceDependencies } from "./deps";

function createPlaceholderTexture(width = 512, height = 512) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    const color = new THREE.Color(0xffffff);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    for (let i = 0; i < size; i++) {
        const stride = i * 4;

        data[stride] = r;
        data[stride + 1] = g;
        data[stride + 2] = b;
        data[stride + 3] = 255;
    }

    // used the buffer to create a DataTexture
    const texture = new THREE.DataTexture(data, width, height);
    texture.needsUpdate = true;
    return texture;
}

export const TEXTURE_PLACEHOLDER_WHITE_1X1 = createPlaceholderTexture(1, 1);

export function controlValueToThreeValue(ctrl: ControlValueType, type: string, deps: IResourceDependencies): THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number | Boolean | THREE.Texture {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
    switch (type) {
        case 'color': {
            const { r, g, b, a } = ctrl as Color;
            return new THREE.Vector4(r, g, b, a);
        }
        case 'float4': {
            const { x, y, z, w } = ctrl as Vector4;
            return new THREE.Vector4(x, y, z, w);
        }
        case 'float3': {
            const { x, y, z } = ctrl as Vector3;
            return new THREE.Vector3(x, y, z);
        }
        case 'float2': {
            const { x, y } = ctrl as Vector2;
            return new THREE.Vector2(x, y);
        }
        case 'mesh':
            // nothing todo: meshes are not supported in vs/ps shaders
            return null;
        case 'texture2d':
            return deps.textures[ctrl as string] || TEXTURE_PLACEHOLDER_WHITE_1X1;
        case 'uint':
        case 'int':
        case 'float':
            return ctrl as Number;
        case 'bool':
            return ctrl as Boolean;
        default:
            console.error('unsupported type found');
    }
    return null;
}



export function typedNumberToF32Num(num: number | boolean, type: string): number {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
    switch (type) {
        case 'float':
            return +num;
        case 'int':
            dv.setInt32(0, +num);
            return dv.getFloat32(0);
        case 'uint':
            dv.setUint32(0, +num);
            return dv.getFloat32(0);
        case 'bool':
            dv.setUint32(0, +num);
            return dv.getFloat32(0);
        default:
            console.error('unsupported type found');
    }
    return null;
}
