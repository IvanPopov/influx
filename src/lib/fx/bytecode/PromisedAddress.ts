import { EMemoryLocation, EOperation } from "@lib/idl/bytecode";
import { assert, isNumber, isDefAndNotNull } from "@lib/common";
import { REG_INVALID } from "./common";

export interface IAddrDesc {
    location?: EMemoryLocation;
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
    location: EMemoryLocation;
    addr: number;
    size: number | undefined;
    inputIndex?: number;
    swizzle?: number[];

    constructor( desc: IAddrDesc) {
        this.location = desc.location || EMemoryLocation.k_Registers;
        this.addr = Number(desc.addr);
        this.size = desc.size;           // todo: validate size
        this.inputIndex = desc.inputIndex;
        this.swizzle = desc.swizzle;
    }

    // specify region inside of the original location
    override({ offset, size, swizzle }: IAddrOverride): PromisedAddress {
        offset = offset || 0;
        size = size || 0;

        assert(size + offset <= this.size,
            `current allocation (size ${this.size}) cannot accommodate size ${size} with offset ${offset}`);

        let { location, addr, inputIndex } = this;

        if (swizzle && this.swizzle) {
            swizzle = swizzle.map(i => this.swizzle[i]);
        }

        addr += offset;
        size = size || (this.size - offset);
        swizzle = swizzle || this.swizzle;
        assert(size > 0);
        
        return new PromisedAddress({ location, addr, size, inputIndex, swizzle });
    }


    valueOf(): number {
        if (this.location != EMemoryLocation.k_Registers) {
            assert(false, `address has implicitly moved to ${EMemoryLocation[EMemoryLocation.k_Registers]} from ${EMemoryLocation[this.location]}`); // implicit loading is not allowed
            return REG_INVALID;
        }

        return this.addr;
    }


    static INVALID = new PromisedAddress({ addr: REG_INVALID, size: undefined });
}

export default PromisedAddress;
