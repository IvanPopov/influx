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
    group: THREE.Group;

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
        exposure: 1,
        bloomStrength: 0.3,
        bloomThreshold: 0,
        bloomRadius: 1,
    };

    createSceneControls(bloomPass: UnrealBloomPass, renderer: THREE.WebGLRenderer) {
        const params = this.params;
        const gui = new GUI({ autoPlace: false });

        // gui.name = 'Tonemapping';
        GUI.TEXT_OPEN = 'Show Tonemapping Options';

        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.bottom = '23px';

        gui.add(params, 'bloom');
        gui.add(params, 'exposure', 0.1, 2).onChange((value) => {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
        });

        gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
            bloomPass.threshold = Number(value);
        });

        gui.add(params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
            bloomPass.strength = Number(value);
        });

        gui.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange((value) => {
            bloomPass.radius = Number(value);
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

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

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
                scene.add(group);

                this.group = group;
                this.assignMaterial(this.group);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                this.group = null;
            }
        );
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        this.assignMaterial(this.group);
    }

    protected assignMaterial(group: THREE.Group) {
        if (!group) {
            return;
        }

        const { vertexShader, pixelShader } = this.props.material.getPass(0).getDesc();

        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: vertexShader,
            fragmentShader: pixelShader,
            transparent: false,
            blending: THREE.NormalBlending,
            depthTest: true
        });

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
