import { assert, isNull } from "@lib/common";
import { EAddrType } from "@lib/idl/bytecode";

import { REG_INVALID } from "./common";
import sizeof from "./sizeof";

export interface IAddrDesc {
    type?: EAddrType;
    addr: number | PromisedAddress;
    size: number;

    inputIndex?: number; // required for input locatons
    swizzle?: number[];
}


export interface IAddrOverride {
    size?: number;
    swizzle?: number[];
}


class PromisedAddress implements IAddrDesc {
    type: EAddrType;
    addr: number;
    size: number | undefined;

    inputIndex?: number;
    swizzle?: number[];

    constructor(desc: IAddrDesc) {
        this.type = desc.type || EAddrType.k_Registers;
        this.addr = Number(desc.addr);
        this.size = desc.size;                          // todo: validate size
        this.inputIndex = desc.inputIndex;
        this.swizzle = desc.swizzle ? [ ...desc.swizzle ] : null;
    }

    // specify region inside of the original location
    override({ size, swizzle }: IAddrOverride): PromisedAddress {
        assert(size || swizzle);

        if (swizzle) {
            assert(!size || size === swizzle.length * sizeof.i32());
            if (size && size !== swizzle.length * sizeof.i32()) debugger;
            size = swizzle.length * sizeof.i32();
        }

        let { type, addr, inputIndex } = this;

        if (swizzle && this.swizzle) {
            swizzle = swizzle.map(i => this.swizzle[i]);
        }

        swizzle = swizzle || this.swizzle;
        assert(size > 0);

        return new PromisedAddress({ type, addr, size, inputIndex, swizzle });
    }


    valueOf(): number {
        if (this.type != EAddrType.k_Registers) {
            assert(false, `address has implicitly moved to ${EAddrType[EAddrType.k_Registers]} from ${EAddrType[this.type]}`); // implicit loading is not allowed
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
        const { type, size, inputIndex, addr, swizzle } = this;
        const isPointer = this.isPointer();
        const isInput = this.isInput();
        
        return `${EAddrType[type]} [${isPointer ? '%' : isInput ? '' : 'r'}${addr / 4} ${isInput ? `input(${inputIndex})` : ``}, ${size} bytes]}`;
    }


    static makePointer(regAddr: PromisedAddress, destType: EAddrType, size: number, inputIndex?: number): PromisedAddress {
        assert(regAddr.type === EAddrType.k_Registers);
        assert(!regAddr.swizzle, 'something went wrong :/');
        const type = PromisedAddress.castToPointer(destType);
        const addr = regAddr.addr;
        return new PromisedAddress({ type, addr, size, inputIndex });
    }


    static INVALID = new PromisedAddress({ addr: REG_INVALID, size: undefined });

    // non-pointer address type => pointer
    static castToPointer(type: EAddrType): EAddrType {
        assert(type < EAddrType.k_PointerRegisters);
        return (type + EAddrType.k_PointerRegisters);
    }
}

export default PromisedAddress;
