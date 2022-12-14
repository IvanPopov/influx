import { Uniforms } from "@lib/idl/Uniforms";

export interface IUniformHelperActions {
    raw(data: Uint8Array) : IUniformHelper;
    int(x: number) : IUniformHelper;
    float(x: number) : IUniformHelper;
    float2(x: number, y: number) : IUniformHelper;
    float3(x: number, y: number, z: number) : IUniformHelper;
    float4(x: number, y: number, z: number, w: number) : IUniformHelper;
}

export interface IUniformHelper {
    set(name: string) : IUniformHelperActions;
    finish() : Uniforms;
}

function UniformHelper (storage: Uint8Array = new Uint8Array(256)) : IUniformHelper
{
    let offset = 0;
    let mapping = [];
    let self = { set, finish };

    function finish() : Uniforms
    {
        let uniforms = <Uniforms>{};
        mapping.forEach((entry, i, arr) => {
            let length = (i < (arr.length - 1) ? arr[i + 1].offset : offset) - entry.offset;
            let data = new Uint8Array(storage.buffer, storage.byteOffset + entry.offset, length);
            uniforms[entry.name] = data;
        });
        return uniforms;
    }

    function set(name: string) : IUniformHelperActions
    {
        mapping.push({ name, offset });
        
        function float2(x: number, y: number) : IUniformHelper
        {
            float(x);
            float(y);
            return self;
        }

        function float3(x: number, y: number, z: number) : IUniformHelper
        {
            float(x);
            float(y);
            float(z);
            return self;
        }

        function float4(x: number, y: number, z: number, w: number) : IUniformHelper
        {
            float3(x, y, z);
            float(w);
            return self;
        }
    
        function float(x: number) : IUniformHelper
        {
            (new DataView(storage.buffer, storage.byteOffset)).setFloat32(offset, x, true);
            offset += 4;
            console.assert(offset < storage.byteLength);
            return self;
        }

        function int(x: number) : IUniformHelper
        {
            (new DataView(storage.buffer, storage.byteOffset)).setInt32(offset, x, true);
            offset += 4;
            console.assert(offset < storage.byteLength);
            return self;
        }

        function raw(data: Uint8Array) : IUniformHelper {
            for (let u8 of data) {
                storage[offset] = u8;
                offset++;
            }
            console.assert(offset < storage.byteLength);
            return self;
        }
    
        return { float4, float3, float2, float, int, raw };
    }

    return self;
}

export default UniformHelper;

// let u8 = new Uint8Array(256);
// let helper = UniformHelper(u8);
// helper.set('elapsedTime').float(0);