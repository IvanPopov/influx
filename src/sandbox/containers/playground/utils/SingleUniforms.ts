import { ITimeline } from "@lib/fx/timeline";
import { IMap } from "@lib/idl/IMap";
import { IPlaygroundControlsState } from "@sandbox/store/IStoreState";
import * as THREE from 'three';
import { IUniform } from 'three';
import { controlToThreeValue } from "./controls";
import { IDeps } from "./deps";



export class SingleUniforms {
    private uniforms: IMap<IUniform<THREE.Texture | THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number>> = {
        elapsedTime: { value: 0 },
        elapsedTimeLevel: { value: 0 },
        // elapsedTimeThis: { value: 0 }
    };

    create(controls: IPlaygroundControlsState, deps: IDeps) {
        const uniforms = this.uniforms;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                uniforms[name] = { value: controlToThreeValue(val, ctrl.type, deps) };
            }
        }
    }


    update(controls: IPlaygroundControlsState, timeline: ITimeline, deps: IDeps) {
        const uniforms = this.uniforms;
        const constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                if (uniforms[name])
                    uniforms[name].value = controlToThreeValue(val, ctrl.type, deps);
            }
        }
    }

    data() {
        return this.uniforms;
    }
}