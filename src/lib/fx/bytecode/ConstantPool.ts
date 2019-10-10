import { IMap } from "../../idl/IMap";
import { isDef } from "../../common";
import sizeof from "./sizeof";

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
    _int32Map: IMap<number> = {};
    _float32Map: IMap<number> = {};

    checkInt32(i32: number): number {
        let addr = this._int32Map[i32];
        if (!isDef(addr)) {
            this._int32Map[i32] = this._data.byteLength;
            this._data.addInt32(i32);
            return this._int32Map[i32];
        }
        return addr;
    }

    checkFloat32(f32: number): number {
        let addr = this._float32Map[f32];
        if (!isDef(addr)) {
            this._float32Map[f32] = this._data.byteLength;
            this._data.addFloat32(f32);
            return this._float32Map[f32];
        }
        return addr;
    }

    checkAddr(addr: number): number {
        return this.checkInt32(addr);
    }

    get data(): ConstantPoolMemory {
        return this._data;
    }

    get size(): number {
        return this._data.byteLength;
    }
}


export default ConstanPool;