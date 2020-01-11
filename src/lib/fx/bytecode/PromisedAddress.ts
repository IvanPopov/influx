import { assert } from "@lib/common";
import { EAddrType } from "@lib/idl/bytecode";

import { REG_INVALID } from "./common";
import sizeof from "./sizeof";

export interface IAddrDesc {
    type: EAddrType;
    addr: number | PromisedAddress;
    size?: number;
    swizzle?: number[];
    inputIndex?: number;
}


export interface IAddrOverride {
    size?: number;
    swizzle?: number[];
}


class PromisedAddress {
    type: EAddrType;
    addr: number;
    size: number;
    inputIndex: number;
    swizzle: number[];


    constructor({ type, addr, size = 0, inputIndex = -1, swizzle = null }: IAddrDesc) {
        this.type = type;
        this.addr = Number(addr);
        this.inputIndex = inputIndex;

        assert(!swizzle || !size || swizzle.length * sizeof.i32() === size, 'size and swizzling are not compatible');
        if (swizzle) {
            size = swizzle.length * sizeof.i32();
        }

        this.size = size;
        this.swizzle = swizzle;

        assert(addr === REG_INVALID || size > 0, 'invalid address size found');
        assert(size % sizeof.i32() === 0, 'invalid address alignment found');
    }

    
    get byteLength(): number {
        return this.size;
    }

    get length(): number {
        return this.size / sizeof.i32();
    }


    valueOf(): number {
         // guard of implicit loading
        if (this.type != EAddrType.k_Registers) {
            assert(false, `address has implicitly moved to ${EAddrType[EAddrType.k_Registers]} from ${EAddrType[this.type]}`);
            return REG_INVALID;
        }

        return this.addr;
    }


    isPointer(): boolean {
        return this.type >= EAddrType.k_PointerRegisters;
    }

    isInput(): boolean {
        return this.type == EAddrType.k_Input || this.type == EAddrType.k_PointerInput;
    }


    toNumber() {
        return this.addr;
    }


    toString() {
        const { type, inputIndex, addr, swizzle, byteLength } = this;
        const isPointer = this.isPointer();
        const isInput = this.isInput();
        // TODO: print swizzling
        return `${EAddrType[type]} [${isPointer ? '%' : isInput ? '' : 'r'}${addr / 4} ${isInput ? `input(${inputIndex})` : ``}, ${byteLength} bytes]}`;
    }

    // non-pointer address type => pointer
    static castToPointer(type: EAddrType): EAddrType {
        assert(type < EAddrType.k_PointerRegisters);
        return (type + EAddrType.k_PointerRegisters);
    }

    static makePointer(regAddr: PromisedAddress, destType: EAddrType, size: number, inputIndex?: number): PromisedAddress {
        assert(regAddr.type === EAddrType.k_Registers);
        assert(!regAddr.swizzle, 'something went wrong :/');
        const type = PromisedAddress.castToPointer(destType);
        const addr = regAddr.addr;
        return new PromisedAddress({ type, addr, size, inputIndex });
    }


    static INVALID = new PromisedAddress({ type: EAddrType.k_Registers, addr: REG_INVALID, size: 0 });
}

export default PromisedAddress;
