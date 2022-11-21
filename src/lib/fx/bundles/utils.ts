import { isObject } from "@lib/common";
import { Bundle, BundleT, PresetT, UIControlT, UIProperties } from "@lib/idl/bundles/FxBundle_generated";
import { IMap } from "@lib/idl/IMap";
import { Color, ControlValues, IPlaygroundControlProps, IPlaygroundControls, IPlaygroundPreset, Vector3, Vector4 } from "@sandbox/store/IStoreState";
import * as flatbuffers from 'flatbuffers';

export function decodeProp(type: string, data: Uint8Array): Vector3 | Color | Number {
    switch (type) {
        case 'UIColor': 
        {
            const view = new Float32Array(data.buffer, data.byteOffset);
            return { r: view[0], g: view[1], b: view[2], a: view[3] };
        }
        case 'UIFloatSpinner':
        case 'UIFloat': 
        {
            const view = new Float32Array(data.buffer, data.byteOffset);
            return view[0];
        }
        case 'UIFloat3':
        {
            const view = new Float32Array(data.buffer, data.byteOffset);
            return { x: view[0], y: view[1], z: view[2] };
        }
        case 'UIInt':
        case 'UISpinner':
        {
            const view = new Int32Array(data.buffer, data.byteOffset);
            return view[0];
        }
        case 'UIUint':
        {
            const view = new Uint32Array(data.buffer, data.byteOffset);
            return view[0];
        }
    }
    console.assert(false, 'unsupported control type is found!');
    return null;
}


export function decodeValues(controls: UIControlT[]): ControlValues {
    let values: ControlValues = {};
    controls.forEach(ctrl => {
        const type = UIProperties[ctrl.propsType];
        const value = decodeProp(type, new Uint8Array(ctrl.props.value));
        const copy = isObject(value) ? { ...value } : value;
        values[ctrl.name as string] = copy;
    });
    return values;
}


export function decodeProps(controls: UIControlT[]): IMap<IPlaygroundControlProps> {
    let props: IMap<IPlaygroundControlProps> = {};
    controls.forEach(ctrl => {
        const type = UIProperties[ctrl.propsType];
        const value = decodeProp(type, new Uint8Array(ctrl.props.value));
        const name = <string>ctrl.props.name;
        props[ctrl.name as string] = { ...ctrl.props, type, name, value };
    });
    return props;
}


export function decodePresets(presets: PresetT[]): IPlaygroundPreset[] {
    // some kind of muddy and clumsy convert from flatbuffers to native TS :/
    return presets.map(({ name, desc, data }): IPlaygroundPreset => 
        ({ 
            name: <string>name, 
            desc: <string>desc,
            data: data.map(({ name, value }) => ({ name: <string>name, value: new Uint8Array(value) })) 
        }));
}

export function decodeBundleControls(data: Uint8Array | BundleT): IPlaygroundControls {
    let fx: BundleT = null;

    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        fx = new BundleT();
        Bundle.getRootAsBundle(new flatbuffers.ByteBuffer(data)).unpackTo(fx);
    } else {
        fx = <BundleT>data;
    }
    
    const props = decodeProps(fx.controls);
    const values = decodeValues(fx.controls);
    const presets = decodePresets(fx.presets);
    
    return { props, values, presets };
}


export function encodeControlsToString(controls: IPlaygroundControls): string {
    let data = [];
    const vals = controls.values;
    for (let name in vals) {
        const value = vals[name];
        const args = [];
        switch (controls.props[name].type) {
            case 'UIFloatSpinner':
            case 'UIFloat': 
                args.push(value); 
                break;
            case 'Spinner':
            case 'UIUint':
            case 'UIInt': 
                args.push(Math.round(Number(value))); 
                break;
            case 'UIFloat3': 
                let v3 = value as Vector3;
                args.push(v3.x, v3.y, v3.z); 
                break;
            case 'UIColor': 
                let c = value as Color;
                args.push(c.r, c.g, c.b, c.a); 
                break;
        }
        data.push(`${name} = { ${args.join(', ')} }`);
    }
    return [...data, null].join(';\n');
}

export function colorToUint({ r, g, b, a }: Color) {
    [r ,g, b, a] = [r, g, b, a].map(x => Math.max(0, Math.min(255, x * 255)));
    return /*a << 24 | */b << 0 | g << 8 | r << 16;
}

export function uintToColor(src: number, dst: Color) {
    dst.r = ((src >> 16) & 0xff) / 255.0;
    dst.g = ((src >> 8) & 0xff) / 255.0;
    dst.b = ((src >> 0) & 0xff) / 255.0;
}
