import { ITimeline } from "@lib/fx/timeline";
import { IMap } from "@lib/idl/IMap";
import { IPlaygroundControlsState } from "@sandbox/store/IStoreState";
import * as THREE from 'three';
import { controlValueToThreeValue } from "./controls";
import { IResourceDependencies } from "./deps";

type IUniform = THREE.IUniform<THREE.Texture | THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number>;

export class SingleUniforms {
    static create(controls: IPlaygroundControlsState, deps: IResourceDependencies): IMap<THREE.IUniform> {
        const uniforms: IMap<IUniform> = {
            elapsedTime: { value: 0 },
            elapsedTimeLevel: { value: 0 },
            // elapsedTimeThis: { value: 0 }
        };

        if (controls) {
            for (let name in controls.values) {
                let value = controls.values[name];
                let ctrl = controls.controls[name];
                uniforms[name] = { value: controlValueToThreeValue(value, ctrl.type, deps) };
            }
        }

        return uniforms;
    }


    static update(controls: IPlaygroundControlsState, timeline: ITimeline, deps: IResourceDependencies, uniforms: IMap<IUniform>, dynamicTextures?: Record<string, THREE.Texture>) {
        const constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                if (uniforms[name])
                    uniforms[name].value = controlValueToThreeValue(val, ctrl.type, deps);
            }
        }

        if (dynamicTextures) {
            for (const name in dynamicTextures) {
                const value = dynamicTextures[name];
                uniforms[name] ||= { value };
            }
        }
    }
}