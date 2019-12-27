import { assert, isNull } from "@lib/common";
import { EAddrType } from "@lib/idl/bytecode";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { CBUFFER0_REGISTER } from "./Bytecode";
import PromisedAddress from "./PromisedAddress";

export class ConstantPoolMemory {
    byteArray: Uint8Array;
    byteLength: number;

    constructor() {
        this.byteArray = new Uint8Array(4);
        this.byteLength = 0;
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
        var newBuffer = new Uint8Array(Math.max(expected, this.byteCapacity * 2));
        newBuffer.set(oldBuffer);

        this.byteArray = newBuffer;
    }

    /**
     * 
     * @param size Size in bytes.
     */
    addUniform(size: number, name: string) {
        this.check(size);
        this.byteLength += size;
    }
}

export interface IConstantReflection {
    name: string;
    size: number;
    offset: number;
    semantic: string;
    type: string;
}

export class ConstanPool {
    protected _data: ConstantPoolMemory = new ConstantPoolMemory;
    protected _knownConstants: IConstantReflection[] = [];

    deref(decl: IVariableDeclInstruction): PromisedAddress {
        assert(decl.isGlobal() && decl.type.isUniform());
        const { name, semantic, initExpr, type: { size } } = decl;

        let reflection = this._knownConstants.find(c => c.name === name);
        if (!reflection) {
            let addr = null;
            if (isNull(initExpr)) {
                // TODO: add type to description
                addr = this.addUniform(size, `${name}${semantic? `:${semantic}`: '' }`);
            } else {
                assert(false, 'unsupported');
                return PromisedAddress.INVALID;
            }

            const { addr: offset } = addr;
            const type = decl.type.name; // TODO: use signature?

            reflection = {
                name,
                semantic,
                offset,
                size,
                type
            };

            this._knownConstants.push(reflection);
        }

        // NOTE: we return copy because adress will be loaded
        return new PromisedAddress({
            type: EAddrType.k_Input,
            inputIndex: CBUFFER0_REGISTER,
            addr: reflection.offset,
            size
        });
    }


    private addUniform(size: number, desc: string): PromisedAddress {
        const addr = this._data.byteLength;
        this._data.addUniform(size, desc);

        return new PromisedAddress({
            type: EAddrType.k_Input,
            inputIndex: CBUFFER0_REGISTER,
            addr,
            size
        });
    }

    get data(): ConstantPoolMemory {
        return this._data;
    }

    get size(): number {
        return this._data.byteLength;
    }

    dump(): IConstantReflection[] {
        return this._knownConstants;
    }
}


export default ConstanPool;
