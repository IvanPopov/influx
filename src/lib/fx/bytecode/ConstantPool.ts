import { IMap } from "../../idl/IMap";
import { isDef } from "../../common";
import sizeof from "./sizeof";
import PromisedAddress from "./PromisedAddress";
import { EMemoryLocation } from "@lib/idl/bytecode";

class ConstantPoolMemory {
    byteArray: ArrayBuffer;
    byteLength: number;

    layout: { range: number; value: number | string; }[];

    constructor() {
        this.byteArray = new ArrayBuffer(4);
        this.byteLength = 0;
        this.layout = [];
    }

    get byteCapacity(): number {
        return this.byteArray.byteLength;
    }

    /** Check capacity and make realloc if needed. */
    private check(byteSize: number) {
        let expected = this.byteLength + byteSize; 
        if (expected <= this.byteCapacity) {
            return;
        }
        var oldBuffer = this.byteArray;
        var newBuffer = new ArrayBuffer(Math.max(expected, this.byteCapacity * 2));
        new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer));

        this.byteArray = newBuffer;
    }

    /** Write constant to buffer and update layout info. */
    addInt32(i32: number) {
        this.check(sizeof.i32());
        new DataView(this.byteArray).setInt32(this.byteLength, i32, true);
        this.byteLength += sizeof.i32();

        this.layout.push({ range: sizeof.i32(), value: i32 });
    }

    /** Write constant to buffer and update layout info. */
    addFloat32(f32: number) {
        this.check(sizeof.f32());
        new DataView(this.byteArray).setFloat32(this.byteLength, f32, true);
        this.byteLength += sizeof.f32();

        this.layout.push({ range: sizeof.f32(), value: f32 });
    }
}


class ConstanPool {
    _data: ConstantPoolMemory = new ConstantPoolMemory;
    _int32Map: IMap<PromisedAddress> = {};
    _float32Map: IMap<PromisedAddress> = {};


    i32(i32: number): PromisedAddress {
        let addr = this._int32Map[i32];
        if (!isDef(addr)) {
            this._int32Map[i32] = new PromisedAddress({ 
                addr: this._data.byteLength, 
                size: sizeof.i32(), 
                location: EMemoryLocation.k_Constants 
            });
            this._data.addInt32(i32);
            return this._int32Map[i32];
        }
        return addr;
    }


    f32(f32: number): PromisedAddress {
        let addr = this._float32Map[f32];
        if (!isDef(addr)) {
            this._float32Map[f32] = new PromisedAddress({ 
                addr: this._data.byteLength, 
                size: sizeof.f32(), 
                location: EMemoryLocation.k_Constants 
            });
            this._data.addFloat32(f32);
            return this._float32Map[f32];
        }
        return addr;
    }

    // checkAddr(addr: number): number {
    //     return this.checkInt32(addr);
    // }

    get data(): ConstantPoolMemory {
        return this._data;
    }

    get size(): number {
        return this._data.byteLength;
    }
}


export default ConstanPool;