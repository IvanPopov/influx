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
        return this.length / InstructionList.STRIDE;
    }


    // convert bytes adresses to register numbers
    // validate number of arguments
    // premultiply jump counters with instructions stride
    static prepareInstruction(op: EOperation, args: number[]) {

        // NOTE: keep order as it is done in the VM.ts
        switch (op) {
            case EOperation.k_I32SetConst:
                assert(args.length == 3);
                args[0] >>= 2;
                // args[1] => constant itself
                // args[2] => hint about what type lies in the constant
                break;
            case EOperation.k_I32LoadRegister:
                assert(args.length == 2);
                args[0] >>= 2;
                args[1] >>= 2;
                break;
            case EOperation.k_I32LoadRegistersPointer:
            case EOperation.k_I32StoreRegisterPointer:
                assert(args.length == 3);
                args[0] >>= 2;
                args[1] >>= 2;
                args[2] >>= 2; // byte offset => register offset
                break;
            case EOperation.k_I32LoadInput:
            case EOperation.k_I32StoreInput:
                assert(args.length == 3);
                // args[0] => input index    
                args[1] >>= 2;
                args[2] >>= 2;
                break;
            case EOperation.k_I32LoadInputPointer:
            case EOperation.k_I32StoreInputPointer:
                assert(args.length == 4);
                // args[0] => input index
                args[1] >>= 2;
                args[2] >>= 2;
                args[3] >>= 2; // byte offset => register offset
                break;
            case EOperation.k_I32TextureLoad:
                assert(args.length == 3);
                args[0] >>= 2;  // float4 sized destination address
                args[1];        // is input index of texture
                args[2] >>= 2;  // address of arguments
                break;    
            case EOperation.k_I32ExternCall:
                assert(args.length == 2);
                args[0];              // id of external routine
                args[1] >>= 2;        // cc layout
                break;  
            case EOperation.k_I32Not:
                assert(args.length == 2);
                args[0] >>= 2;
                args[1] >>= 2;
                break;

            case EOperation.k_I32Add:
            case EOperation.k_I32Sub:
            case EOperation.k_I32Mul:
            case EOperation.k_I32Div:
            case EOperation.k_I32Mod:
            case EOperation.k_F32Add:
            case EOperation.k_F32Sub:
            case EOperation.k_F32Mul:
            case EOperation.k_F32Div:
            case EOperation.k_F32Mod:

            case EOperation.k_U32LessThan:
            case EOperation.k_U32GreaterThanEqual:
            case EOperation.k_I32LessThan:
            case EOperation.k_I32GreaterThanEqual:
            case EOperation.k_I32Equal:
            case EOperation.k_I32NotEqual:
            case EOperation.k_F32LessThan:
            case EOperation.k_F32GreaterThanEqual:
                assert(args.length == 3);
                args[0] >>= 2;
                args[1] >>= 2;
                args[2] >>= 2;
                break;

            case EOperation.k_I32Mad:
                assert(args.length == 4);
                args[0] >>= 2;
                args[1] >>= 2;
                args[2] >>= 2;
                args[3] >>= 2;
                break;

            case EOperation.k_I32LogicalOr:
            case EOperation.k_I32LogicalAnd:
                assert(args.length == 3);
                args[0] >>= 2;
                args[1] >>= 2;
                args[2] >>= 2;
                break;

            case EOperation.k_F32Frac:
            case EOperation.k_F32Floor:
            case EOperation.k_F32Ceil:
            case EOperation.k_F32Sin:
            case EOperation.k_F32Cos:
            case EOperation.k_F32Abs:
            case EOperation.k_F32Sqrt:
                assert(args.length == 2);
                args[0] >>= 2;
                args[1] >>= 2;
                break;

            case EOperation.k_I32Min:
            case EOperation.k_I32Max:
            case EOperation.k_F32Max:
            case EOperation.k_F32Min:
            case EOperation.k_F32Pow:
                assert(args.length == 3);
                args[0] >>= 2;
                args[1] >>= 2;
                args[2] >>= 2;
                break;

            case EOperation.k_F32ToI32:
            case EOperation.k_I32ToF32:
            case EOperation.k_F32ToU32:
            case EOperation.k_U32ToF32:
                assert(args.length == 2);
                args[0] >>= 2;
                args[1] >>= 2;
                break;

            case EOperation.k_Jump:
                assert(args.length === 1);
                // don't multiply jump in order to facilitate the operation of the VM
                // see bundle.cpp/bundle.ts for more details.
                args[0] *= 1; // InstructionList.STRIDE;
                break;
            case EOperation.k_JumpIf:
                assert(args.length === 1);
                args[0] >>= 2;
                break;
            case EOperation.k_Ret:
                // nothing todo
                break;
            default:
                assert(false, `unknown operation found: ${op} (${EOperation[op]})`);
        }
    }


    add(op: EOperation, args: number[]) {
        assert(args.length <= 4);
        this.check(InstructionList.STRIDE);

        InstructionList.prepareInstruction(op, args);

        this.push(op);
        args.forEach((v) => this.push(v));
        this._length += 4 - args.length;
    }

    /**
     * Replace specified instruction with new one;
     * @param pc number of instruction to be replaced
     * @param op new operation
     * @param args new arguments
     */
    replace(pc: number, op: EOperation, args: number[]) {
        assert(pc < this.pc);
        assert(args.length <= 4);

        const pc5 = pc * InstructionList.STRIDE; // stride is 5

        // FIXME: remove this assert
        assert(this.data[pc5] === EOperation.k_Ret || this.data[pc5] === EOperation.k_Jump,
            `expected ${EOperation.k_Ret}/${EOperation.k_Jump}, but given is ${this.data[pc5]} for pc = ${pc}`);

        InstructionList.prepareInstruction(op, args);

        // replace op
        this.data[pc5] = op;
        // replace arguments
        args.forEach((v, i) => { this.data[pc5 + 1 + i] = v; });
    }

    // [ op, a, b, c, d ]
    back() {
        return this.data.slice(-InstructionList.STRIDE);
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

    static STRIDE: number = 5;
}

export default InstructionList;