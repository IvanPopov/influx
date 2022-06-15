import { fromBundleMemory } from '@lib/fx/bytecode/VM/ts/bundle';
import { Bundle, BundleT } from '@lib/idl/bundles/FxBundle_generated';
import * as Bytecode from '@lib/idl/bytecode';
import { IEmitter } from '@sandbox/containers/playground/idl/IEmitter';
import { ITSEmitter, loadEmitterFromBundle } from '@sandbox/containers/playground/ts/emitter';
import * as flatbuffers from 'flatbuffers';

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

let uavResources: Bytecode.IUAV[] = null;
let fx: BundleT = null;

export function load(data: Uint8Array | BundleT): IEmitter
{
    uavResources = [];
    fx = decodeBundleData(data);
    const emitter = loadEmitterFromBundle(fx);
    emitter.reset();
    return emitter;
}

export function unload(emitter: IEmitter): void
{
    console.log('unload TS emitter - nothing todo!');
}

export function reskin(emitter: IEmitter, data: Uint8Array | BundleT): IEmitter
{
    return emitter ? (<ITSEmitter>emitter).reskin(decodeBundleData(data)) : null;
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

