import { Uniforms } from "@lib/idl/Uniforms";

function UniformHelper (storage: Uint8Array = new Uint8Array(256))
{
    let offset = 0;
    let mapping = [];
    let self = { set, finish };

    function finish()
    {
        let uniforms = <Uniforms>{};
        mapping.forEach((entry, i, arr) => {
            let length = (i < (arr.length - 1) ? arr[i + 1].offset : offset) - entry.offset;
            let data = new Uint8Array(storage.buffer, storage.byteOffset + entry.offset, length);
            uniforms[entry.name] = data;
        });
        return uniforms;
    }

    function set(name: string)
    {
        mapping.push({ name, offset });
        
        function float3(x: number, y: number, z: number)
        {
            float(x);
            float(y);
            float(z);
            return self;
        }

        function float4(x: number, y: number, z: number, w: number)
        {
            float3(x, y, z);
            float(w);
            return self;
        }
    
        function float(x: number)
        {
            (new DataView(storage.buffer, storage.byteOffset)).setFloat32(offset, x, true);
            offset += 4;
            console.assert(offset < storage.byteLength);
            return self;
        }

        function int(x: number)
        {
            (new DataView(storage.buffer, storage.byteOffset)).setInt32(offset, x, true);
            offset += 4;
            console.assert(offset < storage.byteLength);
            return self;
        }

        function raw(data: Uint8Array) {
            for (let u8 of data) {
                storage[offset] = u8;
                offset++;
            }
            console.assert(offset < storage.byteLength);
            return self;
        }
    
        return { float4, float3, float, int, raw };
    }

    return self;
}

export default UniformHelper;

// let u8 = new Uint8Array(256);
// let helper = UniformHelper(u8);
// helper.set('elapsedTime').float(0);