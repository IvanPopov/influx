import { fromBundleMemory } from '@lib/fx/bytecode/VM/ts/bundle';
import { Bundle, BundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as Bytecode from '@lib/idl/bytecode';
import { IEmitter } from '@lib/idl/emitter';
import * as flatbuffers from 'flatbuffers';
import { copyTsEmitter, createTsEmitter, destroyTsEmitter } from './emitter';

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

export function createEmitter(data: Uint8Array | BundleT): IEmitter
{
    const emitter = createTsEmitter(decodeBundleData(data));
    emitter.reset();
    return emitter;
}

export function destroyEmitter(emitter: IEmitter): void
{
    destroyTsEmitter(emitter);
}


export function copyEmitter(dst: IEmitter, src: IEmitter): boolean
{
    return copyTsEmitter(dst, src);
}

//
//
//

export function memoryToU8Array(input: Bytecode.IMemory): Uint8Array
{
    const buffer = fromBundleMemory(input);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export function memoryToF32Array(input: Bytecode.IMemory): Float32Array
{
    const buffer = fromBundleMemory(input);
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length);
}

export function memoryToI32Array(input: Bytecode.IMemory): Int32Array
{
    return fromBundleMemory(input);
}

