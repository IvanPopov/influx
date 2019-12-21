import { assert } from "@lib/common";
import { EOperation } from "@lib/idl/bytecode/EOperations";

// todo: use more compact format than 4 x int32

class InstructionList {
    private _data: Uint32Array;
    private _length: number;

    constructor() {
        this._data = new Uint32Array(8);
        this._length = 0;
    }

    
    get capacity(): number {
        return this._data.length;
    }


    get data(): Uint32Array {
        return this._data.subarray(0, this._length);
    }


    get length(): number {
        return this._length;
    }


    get pc(): number {
        return this.length / 5;
    }

    
    add(op: EOperation, args: number[]) {
        assert(args.length <= 4);
        this.check(5);
        this.push(op);
        args.forEach((v) => this.push(v));
        this._length += 4 - args.length;
    }


    // merge(list: InstructionList): void {
    //     this.check(list.length);
    //     this._data.set(list.data, this._length);
    //     this._length += list.length;
    // }

    /**
     * Replace specified instruction with new one;
     * @param pc number of instruction to be replaced
     * @param op new operation
     * @param args new arguments
     */
    replace(pc: number, op: EOperation, args: number[]) {
        assert(pc < this.pc);
        assert(args.length <= 3);

        const pc5 = pc * 5;
        
        // FIXME: remove this assert
        assert(this.data[pc5] === EOperation.k_Ret || this.data[pc5] === EOperation.k_Jump, 
            `expected ${EOperation.k_Ret}/${EOperation.k_Jump}, but given is ${this.data[pc5]} for pc = ${pc}`); 
        
        this.data[pc5] = op;

        args.forEach((v, i) => { 
            this.data[pc5 + 1 + i] = v; 
        });
    }

    private push(val: number) {
        assert(this.capacity - this._length >= 1);
        this._data[this._length++] = val;
    }

    
    private check(count: number) {
        let expected = this._length + count;
        if (expected <= this.capacity) {
            return;
        }

        var oldData = this._data;
        var newData = new Uint32Array(Math.max(expected, this.capacity * 2));
        newData.set(oldData);

        this._data = newData;
    }
}

export default InstructionList;