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

    private check(byteSize: number) {
        let expected = this.byteLength + byteSize; 
        if (expected <= this.byteCapacity) {
            return;
        }
        // this.byteArray = ArrayBuffer.transfer(this.byteArray, this.byteCapacity * 2);
        var oldBuffer = this.byteArray;
        var newBuffer = new ArrayBuffer(Math.max(expected, this.byteCapacity * 2));
        new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer));

        this.byteArray = newBuffer;
    }

    addInt32(i32: number) {
        this.check(sizeof.i32());
        new DataView(this.byteArray).setInt32(this.byteLength, i32, true);
        this.byteLength += sizeof.i32();

        this.layout.push({ range: sizeof.i32(), value: i32 });
    }
}

class ConstanPool {
    _data: ConstantPoolMemory = new ConstantPoolMemory;
    _intMap: IMap<number> = {};

    checkInt32(i32: number): number {
        let addr = this._intMap[i32];
        if (!isDef(addr)) {
            this._intMap[i32] = this._data.byteLength;
            this._data.addInt32(i32);
            return this._intMap[i32];
        }
        return addr;
    }

    get data(): ConstantPoolMemory {
        return this._data;
    }

    get size(): number {
        return this._data.byteLength;
    }
}


export default ConstanPool;