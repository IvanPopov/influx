import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GUI } from 'dat.gui';

import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import * as THREE from 'three';
import autobind from 'autobind-decorator';
import { ITechnique } from '@lib/idl/ITechnique';
import { isString } from '@lib/common';
import { IUniform } from 'three';
import { IMap } from '@lib/idl/IMap';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { Color, Vector2, Vector3, Vector4 } from '@sandbox/store/IStoreState';
import { ControlValueType } from '@lib/fx/bundles/utils';
import { prepareTrimesh } from './utils/adjacency';


function controlToThreeValue(ctrl: ControlValueType, type: string): THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number {
    switch (type) {
        case 'color': {
            const { r, g, b, a } = ctrl as Color;
            return new THREE.Vector4(r, g, b, a);
        }
        case 'float4': {
            const { x, y, z, w } = ctrl as Vector4;
            return new THREE.Vector4(x, y, z, w);
        }
        case 'float3': {
            const { x, y, z } = ctrl as Vector3;
            return new THREE.Vector3(x, y, z);
        }
        case 'float2': {
            const { x, y } = ctrl as Vector2;
            return new THREE.Vector2(x, y);
        }
        case 'float':
        case 'int':
        case 'uint':
            break;
        default:
            console.error('unsupported type found');
            return null;
    }

    return ctrl as Number;
}

interface IMaterialSceneProps extends ITreeSceneProps {
    material: ITechnique;
}


interface IMaterialSceneState extends IThreeSceneState {
    // todo
}


class MaterialScene extends ThreeScene<IMaterialSceneProps, IMaterialSceneState> {
    state: IMaterialSceneState;

    composer: EffectComposer;
    groups: THREE.Group[];

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    protected createRenderer(width, height): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            /* to be able to save screenshots */
            preserveDrawingBuffer: true
        });
        renderer.toneMapping = THREE.ReinhardToneMapping;
        return renderer;
    }

    params = {
        // tonemap
        bloom: false,
        toneMappingExposure: 1.0,
        bloomStrength: 0.3,
        bloomThreshold: 0.0,
        bloomRadius: 1.0,

        // general
        model: 'probe'
    };

    uniforms: IMap<IUniform<THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number>> = {
        elapsedTime: { value: 0 },
        elapsedTimeLevel: { value: 0 },
        // elapsedTimeThis: { value: 0 }
    }

    createSceneControls(bloomPass: UnrealBloomPass, renderer: THREE.WebGLRenderer) {
        const params = this.params;
        const gui = new GUI({ autoPlace: false });

        // gui.name = 'Tonemapping';
        GUI.TEXT_OPEN = 'Show Options';

        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.bottom = '23px';

        let tonemap = gui.addFolder('tonemapping');

        tonemap.add(params, 'bloom').onChange(value => {
            this.saveSceneParams();
        });

        tonemap.add(params, 'toneMappingExposure', 0.1, 2.0).onChange((value) => {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
            this.saveSceneParams();
        }).name('exposure');

        tonemap.add(params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
            bloomPass.threshold = Number(value);
            this.saveSceneParams();
        });

        tonemap.add(params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
            bloomPass.strength = Number(value);
            this.saveSceneParams();
        });

        tonemap.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange((value) => {
            bloomPass.radius = Number(value);
            this.saveSceneParams();
        });

        tonemap.open();

        gui.add(params, 'model', [ 'probe', 'cube' ]).onChange((value) => {
            this.reloadModel();
        });

        gui.close();
    }

    reloadModel() {
        const loader = new OBJLoader();
        const params = this.params;
        const passCount = this.props.material.getPassCount();
        const scene = this.scene;

        this.scene.remove(...(this.groups || []));

        loader.load(
            `./assets/models/${params.model}.obj`,
            (group: THREE.Group) => {

                this.groups = Array(passCount).fill(null).map(x => group.clone(true));
                this.groups.forEach(g => {
                    g.children.forEach(c => {
                        const m = c as THREE.Mesh;
                        const g = m.geometry;
                        prepareTrimesh(g);
                    });
                });
                scene.add(...this.groups);

                this.reloadMaterial();
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                this.groups = null;
            }
        );
    }

    componentDidMount() {
        super.componentDidMount({ grid: true });

        this.scene.background = new THREE.Color(0x333333);

        
        const scene = this.scene;
        const camera = this.camera;
        const params = this.params;
        const renderer = this.renderer;
        

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

        this.restoreSceneParams();

        renderer.toneMappingExposure = params.toneMappingExposure;
        bloomPass.threshold = params.bloomThreshold;
        bloomPass.strength = params.bloomStrength;
        bloomPass.radius = params.bloomRadius;

        this.composer = new EffectComposer(renderer);
        const composer = this.composer;
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        this.createSceneControls(bloomPass, renderer);

        this.createUniformGroups();
        this.createSingleUniforms();

        this.reloadModel();
    }

    shouldComponentUpdate(nextProps: IMaterialSceneProps, nexState) {
        return this.props.material !== nextProps.material;
    }

    // per pass x per buffer
    uniformGroups: THREE.UniformsGroup[][];

    // todo: read buffers layout from reflectio
    createUniformGroups() {
        const passCount = this.props.material.getPassCount();

        this.uniformGroups?.forEach(gs => gs.forEach(g => g.dispose()));
        this.uniformGroups = [];
        for (let p = 0; p < passCount; ++p) {
            const cbuffers = this.props.material?.getPass(p).getDesc().cbuffers;

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
    }

    createSingleUniforms() {
        const controls = this.props.controls;
        const uniforms = this.uniforms;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                uniforms[name] = { value: controlToThreeValue(val, ctrl.type) };
            }
        }
    }

    updateUniformsGroups() {
        const viewMatrix = this.camera.matrixWorldInverse;
        const projMatrix = this.camera.projectionMatrix;
        const viewprojMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix).transpose();

        const { clientWidth, clientHeight } = this.mount;

        const passCount = this.props.material.getPassCount();
        const controls = this.props.controls;

        const timeline = this.props.timeline;
        const constants = timeline.getConstants();

        for (let p = 0; p < passCount; ++p) {
            const cbuffers = this.props.material?.getPass(p).getDesc().cbuffers;
            for (let c = 0; c < cbuffers.length; ++c) {
                let cbuf = cbuffers[c];
                let group = this.uniformGroups[p][c];
                let { name, size, usage } = cbuf;

                switch (name) {
                    case 'AUTOGEN_CONTROLS':
                        {
                            for (let { name, padding } of cbuf.fields) {
                                const pos = (padding / 16) >>> 0; // in vector
                                const ctrl = controls.controls[name];
                                const val = controls.values[name];
                                // todo: use paddings (!)
                                group.uniforms[pos].value = controlToThreeValue(val, ctrl.type);
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


    updateSingleUniforms() {
        const controls = this.props.controls;
        const uniforms = this.uniforms;
        const timeline = this.props.timeline;
        let constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                if (uniforms[name])
                    uniforms[name].value = controlToThreeValue(val, ctrl.type);
            }
        }
    }


    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);

        const passCount = this.props.material.getPassCount();

        this.scene.remove(...this.groups);
        if (passCount > 0) {
            this.groups = Array(passCount).fill(null).map(x => this.groups[0].clone(true) || null);
            this.scene.add(...this.groups);
        }

        this.reloadMaterial();
    }

    protected saveSceneParams() {
        const params = this.params;

        for (let prop in params) {
            localStorage[prop] = params[prop];
        }
    }

    protected restoreSceneParams() {
        const params = this.params;
        params.bloom = isString(localStorage.bloom) ? localStorage.bloom === 'true' : params.bloom;
        params.toneMappingExposure = Number(localStorage.toneMappingExposure || params.toneMappingExposure);
        params.bloomThreshold = Number(localStorage.bloomThreshold || params.bloomThreshold);
        params.bloomStrength = Number(localStorage.bloomStrength || params.bloomStrength);
        params.bloomRadius = Number(localStorage.bloomRadius || params.bloomRadius);

    }

    protected reloadMaterial() {
        const groups = this.groups;

        this.createUniformGroups(); // hack to avoid error: GL_INVALID_OPERATION: It is undefined behaviour to use a uniform buffer that is too small.

        for (let p = 0; p < this.props.material.getPassCount(); ++p) {
            const group = groups[p];
            const { vertexShader, pixelShader, renderStates } = this.props.material.getPass(p).getDesc();
            const uniforms = this.uniforms;

            const material = new THREE.RawShaderMaterial({
                uniforms,
                vertexShader: vertexShader,
                fragmentShader: pixelShader,
                blending: THREE.NormalBlending,
                transparent: false,
                depthTest: true
            });

            (material as any).uniformsGroups = this.uniformGroups[p];

            if (renderStates[ERenderStates.ZENABLE]) {
                material.depthTest = renderStates[ERenderStates.ZENABLE] === ERenderStateValues.TRUE;
            }

            if (renderStates[ERenderStates.BLENDENABLE]) {
                material.transparent = renderStates[ERenderStates.BLENDENABLE] === ERenderStateValues.TRUE;
            }

            if (renderStates[ERenderStates.CULLFACE]) {
                switch (renderStates[ERenderStates.CULLFACE]) {
                    case ERenderStateValues.FRONT:
                        material.side = THREE.FrontSide;
                        break;
                    case ERenderStateValues.BACK:
                        material.side = THREE.BackSide;
                        break;
                    case ERenderStateValues.FRONT_AND_BACK:
                        material.side = THREE.DoubleSide;
                        break;
                }
            }

            for (const object of group.children) {
                const mesh = object as THREE.Mesh;
                mesh.material = material;

                // IP: hack to support default geom layout like:
                // struct Geometry {
                //  float3 position: POSITION0;
                //  float3 normal: NORMAL0;
                //  float2 uv: TEXCOORD0;
                // };
                // console.log(mesh.geometry.attributes);
                // sandbox
                mesh.geometry.attributes['a_position0'] = mesh.geometry.attributes.position;
                mesh.geometry.attributes['a_normal0'] = mesh.geometry.attributes.normal;
                mesh.geometry.attributes['a_texcoord0'] = mesh.geometry.attributes.uv;
                // husky
                mesh.geometry.attributes['a_v_position'] = mesh.geometry.attributes.position;
                mesh.geometry.attributes['a_v_normal'] = mesh.geometry.attributes.normal;
                mesh.geometry.attributes['a_v_texcoord0'] = mesh.geometry.attributes.uv;
            }
        }
    }

    protected fillScene(time: number): void {
        this.updateUniformsGroups();
        this.updateSingleUniforms();

        const timeline = this.props.timeline;
        timeline.tick();
    }

    protected renderScene(time) {
        if (this.params.bloom) {
            this.composer.render();
        } else {
            super.renderScene(time);
        }
    }


    @autobind
    onWindowResize() {
        super.onWindowResize();
        const { clientWidth, clientHeight } = this.mount;
        this.composer.setSize(clientWidth, clientHeight);
    }
}

export default MaterialScene;
