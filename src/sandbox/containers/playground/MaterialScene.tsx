import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GUI } from 'dat.gui';

import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import * as THREE from 'three';
import * as GLSL from './shaders/materials';
import autobind from 'autobind-decorator';
import { ITechnique } from '@lib/idl/ITechnique';
import { isDef, isString } from '@lib/common';
import { IUniform } from 'three';
import { IMap } from '@lib/idl/IMap';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';

const Shaders = (id: string) => GLSL[id];

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
        bloom: false,
        toneMappingExposure: 1.0,
        bloomStrength: 0.3,
        bloomThreshold: 0.0,
        bloomRadius: 1.0,
    };

    uniforms: IMap<IUniform> = {
        elapsedTime: { value: 0 },
        elapsedTimeLevel: { value: 0 },
        // elapsedTimeThis: { value: 0 }
    }

    createSceneControls(bloomPass: UnrealBloomPass, renderer: THREE.WebGLRenderer) {
        const params = this.params;
        const gui = new GUI({ autoPlace: false });

        // gui.name = 'Tonemapping';
        GUI.TEXT_OPEN = 'Show Tonemapping Options';

        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.bottom = '23px';

        gui.add(params, 'bloom').onChange(value => { 
            this.saveSceneParams(); 
        });

        gui.add(params, 'toneMappingExposure', 0.1, 2.0).onChange((value) => {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
            this.saveSceneParams();
        }).name('exposure');

        gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
            bloomPass.threshold = Number(value);
            this.saveSceneParams();
        });

        gui.add(params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
            bloomPass.strength = Number(value);
            this.saveSceneParams();
        });

        gui.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange((value) => {
            bloomPass.radius = Number(value);
            this.saveSceneParams();
        });

        gui.close();
    }

    componentDidMount() {
        super.componentDidMount({ grid: true });

        this.scene.background = new THREE.Color(0x333333);

        const loader = new OBJLoader();
        const scene = this.scene;
        const camera = this.camera;
        const params = this.params;
        const renderer = this.renderer;
        const mat = this.props.material;

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

        loader.load(
            './assets/models/probe.obj',
            (group: THREE.Group) => {

                this.groups = Array(mat.getPassCount()).fill(null).map(x => group.clone(true));
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

    shouldComponentUpdate(nextProps: IMaterialSceneProps, nexState) {
        return this.props.material !== nextProps.material;
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);

        const mat = this.props.material;

        this.scene.remove(...this.groups);
        this.groups = Array(mat.getPassCount()).fill(null).map(x => this.groups[0].clone(true));
        this.scene.add(...this.groups);

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

        for (let iPass = 0; iPass < groups?.length; ++iPass) {
            const group = groups[iPass];
            const { vertexShader, pixelShader, renderStates } = this.props.material.getPass(iPass).getDesc();

            const uniforms = this.uniforms;
            const controls = this.props.controls;

            for (let name in controls.values) {
                uniforms[name] = { value: controls.values[name] };
            }

            const material = new THREE.RawShaderMaterial({
                uniforms,
                vertexShader: vertexShader,
                fragmentShader: pixelShader,
                blending: THREE.NormalBlending,
                transparent: false,
                depthTest: true
            });

            if (renderStates[ERenderStates.ZENABLE]) {
                material.depthTest = renderStates[ERenderStates.ZENABLE] === ERenderStateValues.TRUE;
            }

            if (renderStates[ERenderStates.BLENDENABLE]) {
                material.transparent = renderStates[ERenderStates.BLENDENABLE] === ERenderStateValues.TRUE;
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

                mesh.geometry.attributes['a_position0'] = mesh.geometry.attributes.position;
                mesh.geometry.attributes['a_normal0'] = mesh.geometry.attributes.normal;
                mesh.geometry.attributes['a_texcoord0'] = mesh.geometry.attributes.uv;
            }
        }
    }

    protected fillScene(time: number): void {
        const timeline = this.props.timeline;
        const uniforms = this.uniforms;
        const controls = this.props.controls;

        let constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        for (let name in controls.values) {
            if (uniforms[name])
                uniforms[name].value = controls.values[name];
        }

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
