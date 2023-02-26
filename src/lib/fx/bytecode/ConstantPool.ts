import { assert, isNull } from "@lib/common";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { T_BOOL, T_FLOAT, T_FLOAT2, T_FLOAT3, T_FLOAT4, T_INT, T_INT2, T_INT3, T_INT4, T_UINT } from "@lib/fx/analisys/SystemScope";
import { IConstant, EAddrType } from "@lib/idl/bytecode";
import { EInstructionTypes, IInitExprInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { FloatInstruction } from "../analisys/instructions/FloatInstruction";
import { CBUFFER0_REGISTER } from "./Bytecode";
import { i32ToU8Array } from "./common";
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
    addUniform(size: number, name: string, defaultValue: Uint8Array = null) {
        this.check(size);
        if (defaultValue) {
            this.byteArray.set(defaultValue, this.byteLength);
        }
        this.byteLength += size;
    }
}


export class ConstanPool {
    protected _data: ConstantPoolMemory = new ConstantPoolMemory;
    protected _knownConstants: IConstant[] = [];

    deref(decl: IVariableDeclInstruction): PromisedAddress {
        assert(decl.isGlobal() && (decl.type.isUniform() || decl.isConstant()));
        const { name, semantic, initExpr, type: { size } } = decl;

        let reflection = this._knownConstants.find(c => c.name === name);
        if (!reflection) {
            let addr = null;
            let defaultValue = null;
            if (!isNull(initExpr)) {
                if (decl.type.isNotBaseArray()) {
                    // todo: add support
                    assert(false, 'arrays are not yet supported (!)');
                } else {
                    switch (initExpr.type.name) {
                        case T_FLOAT.name:
                            defaultValue = new Float32Array([ (initExpr as FloatInstruction).value ]);
                            break;
                        case T_UINT.name:
                            defaultValue = new Uint32Array([ (initExpr as IntInstruction).value ]);
                            break;
                        case T_BOOL.name:
                            const value = (initExpr as BoolInstruction).value;
                            defaultValue = new Int32Array([ value ? 1 : 0 ]);
                            break;
                        case T_INT.name:
                            defaultValue = new Int32Array([ (initExpr as IntInstruction).value ]);
                            break;
                        case T_FLOAT2.name:
                        case T_FLOAT3.name:
                        case T_FLOAT4.name:
                            assert(initExpr.instructionType === EInstructionTypes.k_InitExpr);
                            defaultValue = new Float32Array((<IInitExprInstruction>initExpr).args.map(arg => (arg as FloatInstruction).value));
                            break;
                        case T_INT2.name:
                        case T_INT3.name:
                        case T_INT4.name:
                            assert(initExpr.instructionType === EInstructionTypes.k_InitExpr);
                            defaultValue = new Int32Array((<IInitExprInstruction>initExpr).args.map(arg => (arg as IntInstruction).value));
                            break;
                        default:
                            assert(false, 'unsupported');
                            return PromisedAddress.INVALID;
                    }
                }
            }
            addr = this.addUniform(size, `${name}${semantic? `:${semantic}`: '' }`, defaultValue);
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

    // todo: merge with general deref
    derefCString(value: string): PromisedAddress {
        const align4 = (x: number) => ((x + 3) >> 2) << 2;

        let name = `"${value}"`;
        let size = align4(4 /* sizeof(value) */ + value.length + 1 /* trailing zero */);
        let reflection = this._knownConstants.find(c => c.name === name);
        let semantic = "";

        if (!reflection) {
            let u8Data = new Uint8Array(size);
            u8Data.set([...i32ToU8Array(value.length), ...value.split('').map(c => c.charCodeAt(0)), 0]);

            let addr = this.addUniform(size, `"${value}"`, u8Data);
            const { addr: offset } = addr;
            const type = `string`;

            reflection = {
                name,
                offset,
                size,
                type,
                semantic
            };

            this._knownConstants.push(reflection);
        }

        return new PromisedAddress({
            type: EAddrType.k_Input,
            inputIndex: CBUFFER0_REGISTER,
            addr: reflection.offset,
            size
        });
    }


    private addUniform(size: number, desc: string, defaultValue: ArrayBufferView = null): PromisedAddress {
        const addr = this._data.byteLength;
        this._data.addUniform(size, desc, 
            defaultValue ? new Uint8Array(defaultValue.buffer, defaultValue.byteOffset, defaultValue.byteLength) : null);

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

    dump(): IConstant[] {
        return this._knownConstants;
    }
}


export default ConstanPool;
