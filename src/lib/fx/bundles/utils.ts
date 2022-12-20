import { isObject } from "@lib/common";
import { Bundle, BundleT, ColorValueT, ControlValue, Float2ValueT, Float3ValueT, Float4ValueT, FloatValueT, IntValueT, PresetT, PropertyValue, StringValueT, UIControlT, UintValueT, TextureValueT, MeshValueT } from "@lib/idl/bundles/FxBundle_generated";
import { IMap } from "@lib/idl/IMap";
import { Color, ControlValues, IPlaygroundControl, IPlaygroundControlsState, IPlaygroundPreset, IPlaygroundPresetEntry, Vector2, Vector3, Vector4 } from "@sandbox/store/IStoreState";
import { assert } from "@lib/common";
import * as flatbuffers from 'flatbuffers';

export type PropertyValueType = number | string;
export type ControlValueType = number | Vector2 | Vector3 | Vector4 | Color | string;
export type PropertyValueT = UintValueT | IntValueT | FloatValueT | StringValueT;
export type ControlValueT = UintValueT | IntValueT | FloatValueT | Float2ValueT | Float3ValueT | Float4ValueT | ColorValueT | TextureValueT;

// -----------------------------------------------------------------------------------------

export function getFBControlType(type: string) : ControlValue {
    switch(type) {
        case 'int': return ControlValue.IntValue;
        case 'uint': return ControlValue.UintValue;
        case 'float': return ControlValue.FloatValue;
        case 'float2': return ControlValue.Float2Value;
        case 'float3': return ControlValue.Float3Value;
        case 'float4': return ControlValue.Float4Value;
        case 'color': return ControlValue.ColorValue;
        case 'texture2d': return ControlValue.TextureValue;
        case 'mesh': return ControlValue.MeshValue;
    }
    assert(false, 'Unsupported control type');
    return null;
}

export function getFBPropertyType(type: string) : PropertyValue {
    switch(type) {
        case 'int': return PropertyValue.IntValue;
        case 'uint': return PropertyValue.UintValue;
        case 'float': return PropertyValue.FloatValue;
        case 'string': return PropertyValue.StringValue;
    }
    assert(false, 'Unsupported property type');
    return null;
}

export function encodeControlValue(type: string, data: ControlValueType) : ControlValueT {
    switch(type) {
        case 'int': return new IntValueT(data as number);
        case 'uint': return new UintValueT(data as number);
        case 'float': return new FloatValueT(data as number);
        case 'float2':
            let v2 = data as Vector2;
            return new Float2ValueT(v2.x, v2.y);
        case 'float3':
            let v3 = data as Vector3;
            return new Float3ValueT(v3.x, v3.y, v3.z);
        case 'float4':
            let v4 = data as Vector4;
            return new Float4ValueT(v4.x, v4.y, v4.z, v4.w);
        case 'color':
            let color = data as Color;
            let r = Math.max(0, Math.min(255, color.r * 255));
            let g = Math.max(0, Math.min(255, color.g * 255));
            let b = Math.max(0, Math.min(255, color.b * 255));
            let a = Math.max(0, Math.min(255, color.a * 255));
            return new ColorValueT(r, g, b, a);
        case 'texture2d':
            return new TextureValueT(data as string);
        case 'mesh':
            return new MeshValueT(data as string);
    }
    assert(false, 'Unsupported control type');
    return null;
}

export function encodePropertyValue(type: string, data: PropertyValueType) : PropertyValueT {
    switch(type) {
        case 'int': return new IntValueT(data as number);
        case 'uint': return new UintValueT(data as number);
        case 'float': return new FloatValueT(data as number);
        case 'string': return new StringValueT(data as string);
    }
    assert(false, 'Unsupported property type');
    return null;
}

// -----------------------------------------------------------------------------------------

export function getControlType(type: ControlValue) : string {
    switch(type) {
        case ControlValue.IntValue: return 'int';
        case ControlValue.UintValue: return 'uint';
        case ControlValue.FloatValue: return 'float';
        case ControlValue.Float2Value: return 'float2';
        case ControlValue.Float3Value: return 'float3';
        case ControlValue.Float4Value: return 'float4';
        case ControlValue.ColorValue: return 'color';
        case ControlValue.TextureValue: return 'texture2d';
        case ControlValue.MeshValue: return 'mesh';
    }
    assert(false, 'Unsupported control value type');
    return null;
}

export function getPropertyType(type: PropertyValue) : string {
    switch(type) {
        case PropertyValue.IntValue: return 'int';
        case PropertyValue.UintValue: return 'uint';
        case PropertyValue.FloatValue: return 'float';
        case PropertyValue.StringValue: return 'string';
    }
    assert(false, 'Unsupported property value type');
    return null;
}

export function decodeControlValue(type: ControlValue, data: ControlValueT) : ControlValueType {
    switch(type) {
        case ControlValue.IntValue: return (data as IntValueT).value;
        case ControlValue.UintValue: return (data as UintValueT).value;
        case ControlValue.FloatValue: return (data as FloatValueT).value;
        case ControlValue.Float2Value: 
            let v2 = data as Float2ValueT;
            return {x: v2.x, y: v2.y} as Vector2;
        case ControlValue.Float3Value:
            let v3 = data as Float3ValueT;
            return {x: v3.x, y: v3.y, z: v3.z} as Vector3;
        case ControlValue.Float4Value:
            let v4 = data as Float4ValueT;
            return {x: v4.x, y: v4.y, z: v4.z, w: v4.w} as Vector4;
        case ControlValue.ColorValue:
            let color = data as ColorValueT;
            return {r: color.r / 255, g: color.g / 255, b: color.b / 255, a: color.a / 255} as Color;
        case ControlValue.TextureValue:
            return (data as TextureValueT).value as string;
        case ControlValue.MeshValue:
            return (data as MeshValueT).value as string;
    }
    assert(false, 'Unsupported control value type');
    return null;
}

export function decodePropertyValue(type: PropertyValue, data: PropertyValueT) : PropertyValueType {
    switch(type) {
        case PropertyValue.IntValue: return (data as UintValueT).value;
        case PropertyValue.UintValue: return (data as IntValueT).value;
        case PropertyValue.FloatValue: return (data as FloatValueT).value;
        case PropertyValue.StringValue: return (data as StringValueT).value as string;
    }
    assert(false, 'Unsupported property value type');
    return null;
}

// -----------------------------------------------------------------------------------------

export function decodeControls(controlsFx: UIControlT[]): IMap<IPlaygroundControl> {
    let controls : IMap<IPlaygroundControl> = {};
    controlsFx.forEach(controlFx => {
        let properties : IMap<PropertyValueType> = {};
        let controlName = controlFx.name as string;
        let controlType = getControlType(controlFx.valueType);

        controlFx.properties.forEach(propFx => {
            const name = propFx.name as string;
            const value = decodePropertyValue(propFx.valueType, propFx.value);
            properties[name] = value;
        });

        controls[controlName] = { 
            name: controlName, 
            type: controlType,
            properties: properties
        };
    });
    return controls;
}

export function decodeValues(controls: UIControlT[]): ControlValues {
    let values: ControlValues = {};
    controls.forEach(ctrl => values[ctrl.name as string] = decodeControlValue(ctrl.valueType, ctrl.value));
    return values;
}

export function decodePresets(presets: PresetT[]): IPlaygroundPreset[] {
    // some kind of muddy and clumsy convert from flatbuffers to native TS :/
    return presets.map(({ name, desc, data }): IPlaygroundPreset => 
        ({ 
            name: <string>name, 
            desc: <string>desc,
            data: data.map(({ name, valueType, value }) => ({ 
                name: <string>name,
                type: getControlType(valueType),
                value: decodeControlValue(valueType, value)
            } as IPlaygroundPresetEntry))
        }));
}

function decodeBundle(data: Uint8Array | BundleT): BundleT {
    let fx: BundleT = null;

    // load from packed version, see PACKED in @lib/fx/bundles/Bundle.ts
    if (data instanceof Uint8Array) {
        fx = new BundleT();
        Bundle.getRootAsBundle(new flatbuffers.ByteBuffer(data)).unpackTo(fx);
    } else {
        fx = <BundleT>data;
    }

    return fx;
}

export function decodeBundleControls(data: Uint8Array | BundleT): IPlaygroundControlsState {
    const fx = decodeBundle(data);
    const controls = decodeControls(fx.controls);
    const values = decodeValues(fx.controls);
    const presets = decodePresets(fx.presets);
    
    return { controls, values, presets };
}

export function encodeControlsToString(controls: IPlaygroundControlsState): string {
    let data = [];
    for (let name in controls.values) {
        const value = controls.values[name];
        const args = [];
        switch (controls.controls[name].type) {
            case 'int':
            case 'uint':
                args.push(Math.round(Number(value))); 
                break;
            case 'float':
                args.push(value); 
                break;
            case 'float2':
                let v2 = value as Vector2;
                args.push(v2.x, v2.y); 
                break;
            case 'float3':
                let v3 = value as Vector3;
                args.push(v3.x, v3.y, v3.z); 
                break;
            case 'float4':
                let v4 = value as Vector4;
                args.push(v4.x, v4.y, v4.z, v4.w); 
                break;
            case 'color':
                let color = value as Color;
                args.push(color.r, color.g, color.b, color.a);
                break;
        }
        
        data.push(`${name} = { ${args.join(', ')} }`);
    }
    return [...data, null].join(';\n');
}

export function cloneValue(type : string, value : ControlValueType) : ControlValueType {
    switch(type) {
        case 'int':
        case 'uint':
        case 'float':
            return value;
        case 'float2': return {...value as Vector2};
        case 'float3': return {...value as Vector3};
        case 'float4': return {...value as Vector4};
        case 'color': return {...value as Color};
    }
    assert(false, 'Unsupported control type');
    return null;
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
