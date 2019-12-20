import { EAddrType, EOperation } from "@lib/idl/bytecode";
import { assert, isNumber, isDefAndNotNull } from "@lib/common";
import { REG_INVALID } from "./common";

export interface IAddrDesc {
    type?: EAddrType;
    addr: number | PromisedAddress;
    size: number;
    // required for input locatons
    inputIndex?: number;
    swizzle?: number[];
}


export interface IAddrOverride {
    offset?: number;
    size?: number;
    swizzle?: number[];
}


class PromisedAddress implements IAddrDesc {
    type: EAddrType;
    addr: number;
    size: number | undefined;
    inputIndex?: number;
    swizzle?: number[];

    constructor( desc: IAddrDesc) {
        this.type = desc.type || EAddrType.k_Registers;
        this.addr = Number(desc.addr);
        this.size = desc.size;           // todo: validate size
        this.inputIndex = desc.inputIndex;
        this.swizzle = desc.swizzle;
    }

    // specify region inside of the original location
    override({ offset, size, swizzle }: IAddrOverride): PromisedAddress {
        offset = offset || 0;
        size = size || 0;

        assert(size + offset <= Math.max(swizzle ? swizzle.length * 4 : 0, this.size),
            `current allocation (size ${this.size}) cannot accommodate size ${size} with offset ${offset}`);

        let { type: location, addr, inputIndex } = this;

        if (swizzle && this.swizzle) {
            swizzle = swizzle.map(i => this.swizzle[i]);
        }

        addr += offset;
        size = size || (this.size - offset);
        swizzle = swizzle || this.swizzle;
        assert(size > 0);
        
        return new PromisedAddress({ type: location, addr, size, inputIndex, swizzle });
    }


    valueOf(): number {
        if (this.type != EAddrType.k_Registers) {
            assert(false, `address has implicitly moved to ${EAddrType[EAddrType.k_Registers]} from ${EAddrType[this.type]}`); // implicit loading is not allowed
            return REG_INVALID;
        }

        return this.addr;
    }


    toNumber() {
        return this.addr;
    }


    asPointer(destType: EAddrType, size: number): PromisedAddress {
        assert(this.type === EAddrType.k_Registers);
        const type = PromisedAddress.asPointer(destType);
        const addr = this.addr;
        return new PromisedAddress({ type, addr, size });
    }


    static INVALID = new PromisedAddress({ addr: REG_INVALID, size: undefined });

    // non-pointer address type => pointer
    static asPointer(type: EAddrType): EAddrType {
        assert(type < EAddrType.k_PointerRegisters);
        return (type + EAddrType.k_PointerRegisters);
    }
}

export default PromisedAddress;
