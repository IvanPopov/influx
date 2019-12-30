import { assert } from "@lib/common";
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import sizeof from "@lib/fx/bytecode/sizeof";

export function createUAV(name: string, elementSize: number, length: number, register: number) {
    const counterSize = sizeof.i32();
    const size = counterSize + length * elementSize; // in bytes
    assert(size % sizeof.i32() === 0);

    const buffer = new Int32Array(size >> 2);
    const data = buffer.subarray(counterSize >> 2);
    const counter = new Int32Array(buffer.buffer, buffer.byteOffset, 1);
    const index = Bytecode.UAV0_REGISTER + register;

    function overwriteCounter(value: number) {
        counter[0] = value;
    }

    function readCounter(): number {
        return counter[0];
    }

    function readElement(iElement: number): Uint8Array {
        return new Uint8Array(data.buffer, data.byteOffset + iElement * elementSize, elementSize);
    }

    overwriteCounter(0);

    return {
        name,
        readElement,
        readCounter,
        overwriteCounter,
        // byte length of a single element
        elementSize,
        // number of elements
        length, 
        // register specified in the shader
        register,

        // [ elements ]
        data,

        // raw data [ counter, ...elements ]
        buffer,
        // input index for VM
        index
    };
}
