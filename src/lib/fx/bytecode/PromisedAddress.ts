import { EMemoryLocation, EOperation } from "@lib/idl/bytecode";
import { assert, isNumber, isDefAndNotNull } from "@lib/common";
import { REG_INVALID } from "./common";

export interface IAddrDesc {
    location?: EMemoryLocation;
    addr: number | PromisedAddress;
    size: number;
    // required for input locatons
    inputIndex?: number;
}


class PromisedAddress implements IAddrDesc {
    location: EMemoryLocation;
    addr: number;
    size: number | undefined;
    inputIndex?: number;

    constructor( desc: IAddrDesc) {
        this.location = desc.location || EMemoryLocation.k_Registers;
        this.addr = Number(desc.addr);
        this.size = desc.size;           // todo: validate size
        this.inputIndex = desc.inputIndex;
    }

    // specify region inside of the original location
    shift(offset: number, sizeOverride: number = 0): PromisedAddress {
        assert(sizeOverride + offset <= this.size,
            `current allocation (size ${this.size}) cannot accommodate size ${sizeOverride} with offset ${offset}`);

        let { location, addr, size, inputIndex } = this;

        addr += offset;
        size = sizeOverride ? sizeOverride : size - offset;
        assert(size > 0);
        return new PromisedAddress({ location, addr, size, inputIndex });
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
