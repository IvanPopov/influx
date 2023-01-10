import { GUI } from 'dat.gui';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import { isString } from '@lib/common';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { ITechnique } from '@lib/idl/ITechnique';
import autobind from 'autobind-decorator';
import * as THREE from 'three';
import ThreeScene, { IDeps, IThreeSceneState, ITreeSceneProps, resolveExternalDependencies } from './ThreeScene';
import { prepareTrimesh } from './utils/adjacency';




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

        gui.add(params, 'model', [ 'probe', 'cube', 'plane' ]).onChange((value) => {
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

        switch (params.model) {
            case 'plane': 
            {
                const geom = new THREE.PlaneGeometry(2, 2);
                const mesh = new THREE.Mesh(geom, null);
                const group = new THREE.Group();
                group.add(mesh);

                this.groups = [ group ];
                scene.add(...this.groups);
                this.reloadMaterial();
                return;
            }
            break;
        }

        loader.load(
            `./assets/models/${params.model}.obj`,
            (group: THREE.Group) => {

                this.groups = Array(passCount).fill(null).map(x => group.clone(true));
                this.groups.forEach(g => {
                    g.children.forEach(c => {
                        const m = c as THREE.Mesh;
                        const g = m.geometry;
                        // prepareTrimesh(g);
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
        super.componentDidMount({ grid: true, fog: true });

        this.scene.background = new THREE.Color(0x333333);
        this.fog.color = new THREE.Color(0x333333);
        
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

        this.createUniformGroups(this.props.material);
        this.createSingleUniforms();

        this.reloadModel();
    }


    shouldComponentUpdate(nextProps: IMaterialSceneProps, nexState) {
        return this.props.material !== nextProps.material;
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

        const controls = this.props.controls;
        const doLoadTexture = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');
        resolveExternalDependencies(doLoadTexture, doLoadMeshes, this.deps, (deps: IDeps) => {});

        this.createUniformGroups(this.props.material); // hack to avoid error: GL_INVALID_OPERATION: It is undefined behaviour to use a uniform buffer that is too small.

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


    protected beginFrame(): void {
        this.updateUniformsGroups(this.props.material);
        this.updateSingleUniforms();

        const timeline = this.props.timeline;
        timeline.tick();
    }


    protected renderFrame() {
        if (this.params.bloom) {
            this.composer.render();
        } else {
            super.renderFrame();
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
