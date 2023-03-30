import { ITimeline } from "@lib/fx/timeline";
import { AUTOGEN_CONTROLS, AUTOGEN_GLOBALS } from "@lib/fx/translators/FxTranslator";
import { IConstanBufferField, IConstantBuffer } from "@lib/idl/ITechnique";
import { ITechnique9 } from "@lib/idl/ITechnique9";
import { IPlaygroundControlsState } from "@sandbox/store/IStoreState";
import * as THREE from 'three';
import { controlValueToThreeValue, typedNumberToF32Num } from "./controls";
import { IResourceDependencies } from "./deps";

export interface IViewport {
    width: number;
    height: number;
}

export function div2Viewport({ clientWidth, clientHeight }: HTMLDivElement): IViewport {
    const pixelRatio = window.devicePixelRatio;
    const width = clientWidth * pixelRatio;
    const height = clientHeight * pixelRatio;
    return { width, height };
}

function copyVec4({ padding }: IConstanBufferField, v: THREE.Vector4, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0; // in vector
    const pad = (padding % 16) / 4;
    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray(v.toArray(), 0);
}

function copyVec3({ padding }: IConstanBufferField, src: THREE.Vector3, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0; // in vector
    const pad = (padding % 16) / 4;
    const dst = group.uniforms[pos + 0].value as THREE.Vector4;
    src.toArray().forEach((x, i) => dst.setComponent(pad + i, x));
}

function copyVec2({ padding }: IConstanBufferField, src: THREE.Vector2, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0; // in vector
    const pad = (padding % 16) / 4;
    const dst = group.uniforms[pos + 0].value as THREE.Vector4;
    src.toArray().forEach((x, i) => dst.setComponent(pad + i, x));
}

function copyMat4x4({ padding }: IConstanBufferField, mat: THREE.Matrix4, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0; // in vector
    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray(mat.elements, 0);
    (group.uniforms[pos + 1].value as THREE.Vector4).fromArray(mat.elements, 4);
    (group.uniforms[pos + 2].value as THREE.Vector4).fromArray(mat.elements, 8);
    (group.uniforms[pos + 3].value as THREE.Vector4).fromArray(mat.elements, 12);
}


function copyMat4x3({ padding }: IConstanBufferField, mat: THREE.Matrix4, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0; // in vector
    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray(mat.elements, 0);
    (group.uniforms[pos + 1].value as THREE.Vector4).fromArray(mat.elements, 4);
    (group.uniforms[pos + 2].value as THREE.Vector4).fromArray(mat.elements, 8);
}

/** Write constan buffer entry to uniform group. */
function copyControl(
    state: IPlaygroundControlsState,
    field: IConstanBufferField,
    i: number,
    deps: IResourceDependencies,
    group: THREE.UniformsGroup) {
    const name = `${field.name}${i >= 0 ? `[${i}]` : ``}`;
    let offset = 0;
    if (field.length != -1) {
        const step = (field.size / field.length) >>> 0;
        console.assert(step * field.length === field.size, 'padding?!');
        offset = step * i;
    }
    const pos = ((field.padding + offset) / 16) >>> 0;
    const pad = ((field.padding + offset) % 16) / 4;

    const ctrl = state.controls[name];
    const val = state.values[name];
    if (['bool', 'uint', 'int', 'uint', 'float'].indexOf(ctrl.type) !== -1) {
        const f32Num = typedNumberToF32Num(controlValueToThreeValue(val, ctrl.type, deps) as number, ctrl.type);
        (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, f32Num);
    } else {
        group.uniforms[pos].value = controlValueToThreeValue(val, ctrl.type, deps);
    }
}

function copyFloat32({ padding }: IConstanBufferField, value: number, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0;
    const pad = (padding % 16) / 4;
    (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, value);
}

function copyUint32({ padding }: IConstanBufferField, value: number, group: THREE.UniformsGroup) {
    const pos = (padding / 16) >>> 0;
    const pad = (padding % 16) / 4;
    (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, typedNumberToF32Num(value, 'uint'));
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
        deps: IResourceDependencies,
        tech9: ITechnique9
    ): void {
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
        deps: IResourceDependencies,
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
        const modelViewProjMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, modelViewMatrix);
        const viewProjMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix);

        const { width, height } = viewport;
        const constants = timeline.getConstants();

        const resolution = new THREE.Vector2(width, height);
        const date = new THREE.Vector4();
        {
            const now = new Date();
            const year = now.getFullYear();     // ~2020
            const month = now.getMonth();       // 0 - 11
            const day = now.getDate();          // 0 - 30
            const hour = now.getHours();        // 0 - 23
            const min = now.getMinutes();       // 0 - 59
            const sec = now.getSeconds();       // 0 - 60
            const msec = now.getMilliseconds(); // 0 - 999

            date.x = year;
            date.y = month;
            date.z = day;
            date.w = hour * 60.0 + min * 60.0 + sec + msec / 1000.0;
        }


        for (let c = 0; c < cbuffers.length; ++c) {
            let cbuf = cbuffers[c];
            let group = groups[c];
            let { name, size, usage } = cbuf;

            switch (name) {
                case AUTOGEN_CONTROLS:
                    {

                        for (let field of cbuf.fields) {
                            if (field.length == -1) {
                                copyControl(controls, field, -1, deps, group);
                            } else {
                                for (let i = 0; i < field.length; ++i) {
                                    copyControl(controls, field, i, deps, group);
                                }
                            }
                        }
                    }
                    break;
                case AUTOGEN_GLOBALS:
                    for (let field of cbuf.fields) {
                        switch (field.semantic) {
                            case 'ELAPSED_TIME_LEVEL':
                                copyFloat32(field, constants.elapsedTimeLevel, group);
                                break;
                            case 'ELAPSED_TIME':
                                copyFloat32(field, constants.elapsedTime, group);
                                break;
                            case 'FRAME_NUMBER':
                                copyUint32(field, constants.frameNumber, group);
                                break;
                            case 'RESOLUTION':
                                copyVec2(field, resolution, group);
                                break;
                            case 'DATE':
                                copyVec4(field, date, group);
                                break;
                            // todo: move to locals
                            case 'MODEL_MATRIX':
                                copyMat4x4(field, modelMatrix, group);
                                break;
                            // todo: move to locals
                            case 'MODEL_VIEW_MATRIX':
                                copyMat4x4(field, modelViewMatrix, group);
                                break;
                            case 'MODEL_VIEW_PROJECTION_MATRIX':
                                // TODO: fixme me, the only one user is technique11.fx at the moment (!)
                                copyMat4x4(field, transpose(modelViewProjMatrix), group);
                                break;
                            case 'VIEW_MATRIX':
                                copyMat4x4(field, viewMatrix, group);
                                break;
                            case 'PROJECTION_MATRIX':
                                copyMat4x4(field, projMatrix, group);
                                break;
                            case 'CAMERA_POSITION':
                                copyVec3(field, camera.position, group);
                                break;
                            default:
                                // todo: emit once (!)
                                // console.error(`GLOBAL_UNIFORMS: unknown semantic <${field.semantic}> found.`);
                        }
                    }
                    break;
                default:
                    for (let field of cbuf.fields) {
                        switch (field.semantic) {
                            case 'COMMON_VIEWPROJ_MATRIX':
                                // note: husky uses transposed matrices (!)
                                copyMat4x4(field, transpose(viewProjMatrix), group);
                                break;
                            case 'COMMON_VP_PARAMS':
                                {
                                    const pos = (field.padding / 16) >>> 0; // in vector
                                    (group.uniforms[pos + 0].value as THREE.Vector4).fromArray([1.0 / width, 1.0 / height, 0.5 / width, 0.5 / height]);
                                }
                                break;
                            case 'VS_REG_COMMON_OBJ_WORLD_MATRIX_DEBUG':
                                copyMat4x3(field, identityMatrix, group);
                                break;
                        }
                    }
            }
        }
    }


}