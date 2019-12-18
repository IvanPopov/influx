import { assert, isDef, isNull } from "@lib/common";
import { EMemoryLocation, IMemoryRecord } from "@lib/idl/bytecode";
import { IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

import PromisedAddress from "./PromisedAddress";
import sizeof from "./sizeof";
import SymbolTable from "./SymbolTable";

export class ConstantPoolMemory {
    byteArray: Uint8Array;
    byteLength: number;

    layout: IMemoryRecord[];

    constructor() {
        this.byteArray = new Uint8Array(4);
        this.byteLength = 0;
        this.layout = [];
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

    /** Write constant to buffer and update layout info. */
    addInt32(i32: number) {
        this.check(sizeof.i32());
        new DataView(this.byteArray.buffer).setInt32(this.byteLength, i32, true);
        this.byteLength += sizeof.i32();

        this.layout.push({ range: sizeof.i32(), value: i32, type: 'i32' });
    }

    /** Write constant to buffer and update layout info. */
    addFloat32(f32: number) {
        this.check(sizeof.f32());
        new DataView(this.byteArray.buffer).setFloat32(this.byteLength, f32, true);
        this.byteLength += sizeof.f32();

        this.layout.push({ range: sizeof.f32(), value: f32, type: 'f32' });
    }

    /**
     * 
     * @param size Size in bytes.
     */
    addUniform(size: number, name: string) {
        this.check(size);
        this.byteLength += size;
        this.layout.push({ range: size, value: name, type: 'uniform' });
    }
}


export class ConstanPool {
    protected _data: ConstantPoolMemory = new ConstantPoolMemory;
    protected _int32Map: SymbolTable<PromisedAddress> = new SymbolTable;
    protected _float32Map: SymbolTable<PromisedAddress> = new SymbolTable;

    // variable name => addr map
    protected _variableMap: SymbolTable<PromisedAddress> = new SymbolTable;
    // semantic => varible name map
    protected _semanticToNameMap: IMap<string> = {};


    i32(i32: number): PromisedAddress {
        let addr = this._int32Map[i32];
        if (!isDef(addr)) {
            this._int32Map[i32] = new PromisedAddress({
                addr: this.size,
                size: sizeof.i32(),
                location: EMemoryLocation.k_Constants
            });
            this._data.addInt32(i32);
            return this._int32Map[i32];
        }
        return addr;
    }


    f32(f32: number): PromisedAddress {
        let addr = this._float32Map[f32];
        if (!isDef(addr)) {
            this._float32Map[f32] = new PromisedAddress({
                addr: this.size,
                size: sizeof.f32(),
                location: EMemoryLocation.k_Constants
            });
            this._data.addFloat32(f32);
            return this._float32Map[f32];
        }
        return addr;
    }


    deref(decl: IVariableDeclInstruction): PromisedAddress {
        assert(decl.isGlobal() && decl.isUniform());
        const { name, semantic, initExpr, type: { size } } = decl;

        let addr = this._variableMap[name];
        if (!addr) {
            if (isNull(initExpr)) {
                // TODO: add type to description
                addr = this.addUniform(size, `${name}${semantic? `:${semantic}`: '' }`);
            } else {
                assert(false, 'unsupported');
            }

            if (semantic) {
                assert(!this._semanticToNameMap[semantic], `semantic ${semantic} already exists.`);
                this._semanticToNameMap[semantic] = name;
            }

            assert(!this._variableMap[name], `global variable ${name} already exists.`);
            this._variableMap[name] = addr;
        }
        // NOTE: we return copy because adress will be loaded
        return new PromisedAddress(addr);
    }


    private addUniform(size: number, desc: string): PromisedAddress {
        const addr = this._data.byteLength;
        this._data.addUniform(size, desc);

        return new PromisedAddress({
            location: EMemoryLocation.k_Constants,
            addr,
            size
        });
    }

    // checkAddr(addr: number): number {
    //     return this.checkInt32(addr);
    // }

    get data(): ConstantPoolMemory {
        return this._data;
    }

    get size(): number {
        return this._data.byteLength;
    }

    get layout() {
        const names: { name: string, offset: number }[] = [];
        const semantics: { name: string, offset: number }[] = [];

        for (let name in this._variableMap) {
            const offset = this._variableMap[name].toNumber();
            names.push({ name, offset });
        }

        for (let semantic in this._semanticToNameMap) {
            const name = semantic;
            const offset = this._variableMap[this._semanticToNameMap[semantic]].toNumber();
            semantics.push({ name, offset });
        }

        return { names, semantics };
    }

   
}


export default ConstanPool;
