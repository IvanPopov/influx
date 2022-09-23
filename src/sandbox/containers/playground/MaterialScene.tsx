import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GUI } from 'dat.gui';

import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import * as THREE from 'three';
import * as GLSL from './shaders/materials';
import autobind from 'autobind-decorator';

const Shaders = (id: string) => GLSL[id];

interface IMaterialSceneProps extends ITreeSceneProps {
    // todo
}


interface IMaterialSceneState extends IThreeSceneState {
    // todo
}


class MaterialScene extends ThreeScene<IMaterialSceneProps, IMaterialSceneState> {
    state: IMaterialSceneState;

    composer: EffectComposer;

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
        bloom: true,
        exposure: 1,
        bloomStrength: 0.3,
        bloomThreshold: 0,
        bloomRadius: 1,
    };

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

        const gui = new GUI({ autoPlace: false });
        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.top = '2px';

        gui.add(params, 'bloom');

        gui.add(params, 'exposure', 0.1, 2).onChange(function (value) {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
        });

        gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange(function (value) {
            bloomPass.threshold = Number(value);
        });

        gui.add(params, 'bloomStrength', 0.0, 3.0).onChange(function (value) {
            bloomPass.strength = Number(value);
        });

        gui.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange(function (value) {
            bloomPass.radius = Number(value);
        });

        // load a resource
        loader.load(
            './assets/models/probe.obj',
            function (group: THREE.Group) {
                console.log(group);

                const material = new THREE.RawShaderMaterial({
                    uniforms: {},
                    vertexShader: Shaders('defMatVS'),
                    fragmentShader: Shaders('defMatFS'),
                    transparent: false,
                    blending: THREE.NormalBlending,
                    depthTest: true
                });

                for (const object of group.children) {
                    const mesh = object as THREE.Mesh;
                    mesh.material = material;
                }

                scene.add(group);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened');
            }
        );
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
