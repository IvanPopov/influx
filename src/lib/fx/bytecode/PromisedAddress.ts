import { EMemoryLocation, EOperation } from "@lib/idl/bytecode";
import { assert, isNumber, isDefAndNotNull } from "@lib/common";
import { REG_INVALID } from "./common";
import sizeof from "./sizeof";
import { ICallstack } from "./Callstack";

export interface IAddrDesc {
    location?: EMemoryLocation;
    addr: number | PromisedAddress;
    size: number;
    // required for input locatons
    inputIndex?: number;
}


class PromisedAddress {
    location: EMemoryLocation;
    addr: number;
    size: number;
    inputIndex?: number;
    
    ctx: ICallstack;

    constructor(ctx: ICallstack, desc: IAddrDesc) {
        this.ctx = ctx;

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
        return new PromisedAddress(this.ctx, { location, addr, size, inputIndex });
    }

    /**
     * Resolve/move this address/region to registers
     */
    read(): PromisedAddress {
        switch (this.location) {
            case EMemoryLocation.k_Registers:
                // nothing todo, address have already been loaded to registers 
                return this;

            case EMemoryLocation.k_Input:
                {
                    assert(this.size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');

                    const dest = this.ctx.alloca(this.size);
                    // todo: validate inputIndex
                    for (let i = 0, n = this.size / sizeof.i32(); i < n; ++i) {
                        this.ctx.icode(EOperation.k_I32LoadInput,
                            this.inputIndex, Number(dest) + i * sizeof.i32(), this.addr + i * sizeof.i32());
                    }

                    this.location = EMemoryLocation.k_Registers;
                    this.addr = Number(dest);

                    return this.read();
                }
            default:
                assert(false);
        }

        return PromisedAddress.INVALID;
    }


    /**
     * Write something to this location/address
     * @param src Source address.
     * @param size Size of the source location.
     */
    write(src: number | PromisedAddress, size: number): PromisedAddress {
        assert(isNumber(src) || (src as PromisedAddress).size <= size, 
            `source size is ${(src as PromisedAddress).size} and less then the requested size ${size}.`);
        assert(this.size === size, `expected size is ${this.size}, but given is ${size}`);
        
        switch (this.location) {
            case EMemoryLocation.k_Registers:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    this.ctx.icode(EOperation.k_I32MoveRegToReg,
                        this.addr + i * sizeof.i32(), Number(src) + i * sizeof.i32());
                }
                break;

            case EMemoryLocation.k_Input:
                assert(size % sizeof.i32() === 0, 'Per byte/bit loading is not supported.');
                for (let i = 0, n = size / sizeof.i32(); i < n; ++i) {
                    this.ctx.icode(EOperation.k_I32StoreInput, this.inputIndex,
                        this.addr + i * sizeof.i32(), Number(src) + i * sizeof.i32());
                }
                break;
                
            default:
                assert(false);
        }

        return this;
    }


    valueOf(): number {
        if (this.location != EMemoryLocation.k_Registers) {
            console.warn(`address has implicitly moved to ${EMemoryLocation[EMemoryLocation.k_Registers]} from ${EMemoryLocation[this.location]}`);
            assert(false); // implicit loading is not allowed
        }
        return this.read().addr;
    }


    isValid(): boolean {
        return this.addr !== REG_INVALID;
    }

    static INVALID = new PromisedAddress(null, { addr: REG_INVALID, size: 0 });
}

export default PromisedAddress;