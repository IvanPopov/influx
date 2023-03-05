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

function copyMat4x4(uniforms: THREE.Uniform[], offset: number, mat: THREE.Matrix4) {
    const pos = (offset / 16) >>> 0; // in vector
    (uniforms[pos + 0].value as THREE.Vector4).fromArray(mat.elements, 0);
    (uniforms[pos + 1].value as THREE.Vector4).fromArray(mat.elements, 4);
    (uniforms[pos + 2].value as THREE.Vector4).fromArray(mat.elements, 8);
    (uniforms[pos + 3].value as THREE.Vector4).fromArray(mat.elements, 12);
}


function copyMat4x3(uniforms: THREE.Uniform[], offset: number, mat: THREE.Matrix4) {
    const pos = (offset / 16) >>> 0; // in vector
    (uniforms[pos + 0].value as THREE.Vector4).fromArray(mat.elements, 0);
    (uniforms[pos + 1].value as THREE.Vector4).fromArray(mat.elements, 4);
    (uniforms[pos + 2].value as THREE.Vector4).fromArray(mat.elements, 8);
}

function transpose(mat: THREE.Matrix4): THREE.Matrix4 {
    return (new THREE.Matrix4).copy(mat).transpose();
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
            this.uniformGroups.push(GroupedUniforms.create(cbuffers));
        }
    }


    static create(cbuffers: IConstantBuffer[]): THREE.UniformsGroup[] {
        const groups: THREE.UniformsGroup[] = [];
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

        return groups;
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
            const groups = this.uniformGroups[iPass];
            GroupedUniforms.update(camera, viewport, controls, timeline, deps, groups, cbuffers);
        }
    }

    
    static update(
        camera: THREE.PerspectiveCamera,
        viewport: IViewport,
        controls: IPlaygroundControlsState,
        timeline: ITimeline,
        deps: IDeps,
        groups: THREE.UniformsGroup[],
        cbuffers: IConstantBuffer[]
    ) {

        /*
        uniform mat4 modelMatrix;       // = object.matrixWorld
        uniform mat4 modelViewMatrix;   // = camera.matrixWorldInverse * object.matrixWorld
        uniform mat4 projectionMatrix;  // = camera.projectionMatrix
        uniform mat4 viewMatrix;        // = camera.matrixWorldInverse
        uniform mat3 normalMatrix;      // = inverse transpose of modelViewMatrix
        uniform vec3 cameraPosition;    // = camera position in world space
        */

        const identityMatrix = new THREE.Matrix4();
        // todo: move out model matrix from global uniforms
        const modelMatrix = (new THREE.Matrix4).copy(identityMatrix);
        const viewMatrix = (new THREE.Matrix4).copy(camera.matrixWorldInverse);
        const projMatrix = (new THREE.Matrix4).copy(camera.projectionMatrix);
        const modelViewMatrix = (new THREE.Matrix4).multiplyMatrices(viewMatrix, modelMatrix);
        const viewProjMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix);

        const { clientWidth, clientHeight } = viewport;
        const constants = timeline.getConstants();

        for (let c = 0; c < cbuffers.length; ++c) {
            let cbuf = cbuffers[c];
            let group = groups[c];
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
                            case 'MODEL_MATRIX':
                                copyMat4x4(group.uniforms, padding, modelMatrix);
                                break;
                            case 'MODEL_VIEW_MATRIX':
                                copyMat4x4(group.uniforms, padding, modelViewMatrix);
                                break;
                            case 'VIEW_MATRIX':
                                copyMat4x4(group.uniforms, padding, viewMatrix);
                                break;
                            case 'PROJECTION_MATRIX':
                                copyMat4x4(group.uniforms, padding, projMatrix);
                                break;
                            default:
                                // console.error(`GLOBAL_UNIFORMS: unknown semantic <${semantic}> found.`);
                        }
                    }
                    break;
                default:
                    for (let { name, padding, semantic } of cbuf.fields) {
                        switch (semantic) {
                            case 'COMMON_VIEWPROJ_MATRIX':
                                // note: husky uses transposed matrices (!)
                                copyMat4x4(group.uniforms, padding, transpose(viewProjMatrix));
                                break;
                            case 'COMMON_VP_PARAMS':
                                {
                                    const pos = (padding / 16) >>> 0; // in vector
                                    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray([1.0 / clientWidth, 1.0 / clientHeight, 0.5 / clientWidth, 0.5 / clientHeight]);
                                }
                                break;
                            case 'VS_REG_COMMON_OBJ_WORLD_MATRIX_DEBUG':
                                copyMat4x3(group.uniforms, padding, identityMatrix);
                                break;
                        }
                    }
            }
        }
    }


}