import { asBundleMemory, fromBundleMemory } from '@lib/fx/bytecode/VM/ts/bundle';
import * as Bytecode from '@lib/idl/bytecode';
import { ITexture, ITextureDesc, ITrimesh, ITrimeshDesc } from '@lib/idl/emitter/IEmitter';
import { ITechnique } from '@lib/idl/ITechnique';
import * as flatbuffers from 'flatbuffers';
import { copyTsEmitter, createTsEmitter, createTsTexture, createTsTrimesh, destroyTsEmitter, destroyTsTexture, destroyTsTrimesh } from './emitter';
import { copyTsMaterial, createTsMaterial, destroyTsMaterial } from './mat';
import { copyTsTechnique11, createTsTechnique11, destroyTsTechnique11 } from './technique11';
import { assert } from '@lib/common';

import { Bundle, BundleT } from '@lib/idl/bundles/auto/fx/bundle';
import { BundleContent } from '@lib/idl/bundles/auto/fx/bundle-content';


function decodeBundleData(data: Uint8Array | BundleT): BundleT {
    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        let fx = new BundleT();
        let buf = new flatbuffers.ByteBuffer(data);
        Bundle.getRootAsBundle(buf).unpackTo(fx);
        return fx;
    }

    return <BundleT>data;
}



export function createTexture(desc: ITextureDesc, initData: ArrayBufferView): ITexture {
    return createTsTexture(desc, initData);
}


export function destroyTexture(texture: ITexture) {
    destroyTsTexture(texture);
}


export function createTrimesh(desc: ITrimeshDesc, 
    vertices: ArrayBufferView, faces: ArrayBufferView, indicesAdj: ArrayBufferView, facesAdj: ArrayBufferView): ITrimesh {
    return createTsTrimesh(desc, vertices, faces, indicesAdj, facesAdj);
}


export function destroyTrimesh(mesh: ITrimesh) {
    destroyTsTrimesh(mesh);
}

//
//
//


export function createTechnique(data: Uint8Array | BundleT): ITechnique {
    const bundle = decodeBundleData(data);

    if (bundle.contentType === BundleContent.PartBundle) {
        const emitter = createTsEmitter(bundle);
        emitter.reset();
        return emitter;
    }

    if (bundle.contentType === BundleContent.MatBundle) {
        return createTsMaterial(bundle);
    }

    if (bundle.contentType === BundleContent.Technique11Bundle) {
        return createTsTechnique11(bundle);
    }

    return null;
}


export function destroyTechnique(tech: ITechnique): void {
    switch (tech?.getType()) {
        case 'emitter': return destroyTsEmitter(tech); // partFx
        case 'material': return destroyTsMaterial(tech); // basically it's technique9
        case 'technique11': return destroyTsTechnique11(tech);
    }
}


export function copyTechnique(dst: ITechnique, src: ITechnique): boolean {
    assert(dst.getType() === src.getType());
    switch (dst.getType()) {
        case 'emitter': return copyTsEmitter(dst, src);         // partFx
        case 'material': return copyTsMaterial(dst, src);       // basically it's technique9
        case 'technique11': return copyTsTechnique11(dst, src);
    }
    console.assert(false);
    return false;
}


//
//
//

export function memoryToU8Array(input: Bytecode.IMemory): Uint8Array {
    const buffer = fromBundleMemory(input);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}


export function memoryToF32Array(input: Bytecode.IMemory): Float32Array {
    const buffer = fromBundleMemory(input);
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length);
}


export function memoryToI32Array(input: Bytecode.IMemory): Int32Array {
    return fromBundleMemory(input);
}

function copy(src: ArrayBufferView): ArrayBufferView  {
    const dst = new Uint8Array(src.byteLength);
    dst.set(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
    return dst;
}

export function copyViewToMemory(input: ArrayBufferView): Bytecode.IMemory {
    return asBundleMemory(copy(input));
}


export function releaseMemory(mem: Bytecode.IMemory) {
    console.error('NOT IMPLEMENTED!!!');
}

