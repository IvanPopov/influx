import { ITimeline } from "@lib/fx/timeline";
import { IConstantBuffer, ITechnique9 } from "@lib/idl/ITechnique9";
import { IPlaygroundControlsState } from "@sandbox/store/IStoreState";
import * as THREE from 'three';
import { IDeps } from "./deps";
import { controlToThreeValue, storeThreeValue } from "./controls";

interface IViewport {
    clientWidth: number;
    clientHeight: number;
}


export class GroupedUniforms {
    // per pass x per buffer
    private uniformGroups: THREE.UniformsGroup[][];

    data() {
        return this.uniformGroups;
    }

    /** @deprecated */
    create9(tech9: ITechnique9): void {
        this.uniformGroups?.forEach(gs => gs.forEach(g => g.dispose()));
        this.uniformGroups = [];

        // create uniform groups for each pass
        for (let i = 0; i < tech9.getPassCount(); ++i) {
            const cbuffers = tech9.getPass(i).getDesc().cbuffers;
            this.create(cbuffers);
        }
    }


    protected create(cbuffers: IConstantBuffer[]) {
        const groups = [];
        for (let cbuf of cbuffers) {
            let { name, size, usage } = cbuf;

            const nVec4 = size / 16;
            const group = new THREE.UniformsGroup();
            group.setName(name);

            for (let i = 0; i < nVec4; ++i) {
                group.add(new THREE.Uniform(new THREE.Vector4(0, 0, 0, 0)));
            }

            groups.push(group);
        }

        this.uniformGroups.push(groups);
    }


    /** @deprecated */
    update9(camera: THREE.PerspectiveCamera,
        viewport: IViewport,
        controls: IPlaygroundControlsState,
        timeline: ITimeline,
        deps: IDeps,
        tech9: ITechnique9
    ): void {
        const cbuffers: IConstantBuffer[][] = [];
        for (let iPass = 0; iPass < tech9.getPassCount(); ++iPass) {
            const cbuffers = tech9.getPass(iPass).getDesc().cbuffers;
            this.update(camera, viewport, controls, timeline, deps, iPass, cbuffers);
        }
    }

    protected update(
        camera: THREE.PerspectiveCamera,
        viewport: IViewport,
        controls: IPlaygroundControlsState,
        timeline: ITimeline,
        deps: IDeps,
        iPass: number,
        cbuffers: IConstantBuffer[]
    ) {
        const viewMatrix = camera.matrixWorldInverse;
        const projMatrix = camera.projectionMatrix;
        const viewprojMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix).transpose();
        const { clientWidth, clientHeight } = viewport;
        const constants = timeline.getConstants();

        for (let c = 0; c < cbuffers.length; ++c) {
            let cbuf = cbuffers[c];
            let group = this.uniformGroups[iPass][c];
            let { name, size, usage } = cbuf;

            switch (name) {
                case 'AUTOGEN_CONTROLS':
                    {
                        for (let { name, padding } of cbuf.fields) {
                            const pos = (padding / 16) >>> 0;
                            const pad = (padding % 16) / 4;
                            const ctrl = controls.controls[name];
                            const val = controls.values[name];
                            if (['int', 'uint', 'float'].indexOf(ctrl.type) !== -1) {
                                const num = storeThreeValue(controlToThreeValue(val, ctrl.type, deps) as number, ctrl.type);
                                (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, num);
                            } else {
                                group.uniforms[pos].value = controlToThreeValue(val, ctrl.type, deps);
                            }
                        }
                    }
                    break;
                case 'GLOBAL_UNIFORMS':
                    for (let { name, padding, semantic } of cbuf.fields) {
                        switch (semantic) {
                            case 'ELAPSED_TIME_LEVEL':
                                {
                                    const pos = (padding / 16) >>> 0;
                                    const pad = (padding % 16) / 4;
                                    (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, constants.elapsedTimeLevel);
                                }
                                break;
                            case 'ELAPSED_TIME':
                                {
                                    const pos = (padding / 16) >>> 0;
                                    const pad = (padding % 16) / 4;
                                    (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, constants.elapsedTime);
                                }
                                break;
                        }
                    }
                    break;
                default:
                    for (let { name, padding, semantic } of cbuf.fields) {
                        switch (semantic) {
                            case 'COMMON_VIEWPROJ_MATRIX':
                                {
                                    const pos = (padding / 16) >>> 0; // in vector
                                    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 0);
                                    (group.uniforms[pos + 1].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 4);
                                    (group.uniforms[pos + 2].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 8);
                                    (group.uniforms[pos + 3].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 12);
                                }
                                break;
                            case 'COMMON_VP_PARAMS':
                                {
                                    const pos = (padding / 16) >>> 0; // in vector
                                    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray([1.0 / clientWidth, 1.0 / clientHeight, 0.5 / clientWidth, 0.5 / clientHeight]);
                                }
                                break;
                            case 'VS_REG_COMMON_OBJ_WORLD_MATRIX_DEBUG':
                                {
                                    const pos = (padding / 16) >>> 0; // in vector
                                    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray([1, 0, 0, 0]);
                                    (group.uniforms[pos + 1].value as THREE.Vector4).fromArray([0, 1, 0, 0]);
                                    (group.uniforms[pos + 2].value as THREE.Vector4).fromArray([0, 0, 1, 0]);
                                    break;
                                }
                        }
                    }
            }
        }
    }


}