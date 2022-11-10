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
        const passCount = this.props.material.getPassCount();

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

                this.groups = Array(passCount).fill(null).map(x => group.clone(true));
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

        this.createUniformGroups();
    }

    shouldComponentUpdate(nextProps: IMaterialSceneProps, nexState) {
        return this.props.material !== nextProps.material;
    }

    uniformGroups: THREE.UniformsGroup[];
    uniformLayout: IMap<IMap<THREE.Uniform[]>>;

    // todo: read buffers layout from reflectio
    createUniformGroups() {
        this.uniformLayout = {};

        /*
        uniform CB_SCREEN_RECT_DATA
        {
            vec4 COMMON_VP_PARAMS[1];	// padding 0, size 16
            vec4 SCREEN_RECT[1];	// padding 16, size 16
            vec4 SCREEN_UV[1];	// padding 32, size 16
            vec4 RECT_DEPTH[1];	// padding 48, size 16
            uvec4 LWI_PARAMS[2];	// padding 64, size 32
        };
        */
        const screenRectData = new THREE.UniformsGroup();
        screenRectData.setName( 'CB_SCREEN_RECT_DATA' );
        // COMMON_VP_PARAMS
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // SCREEN_RECT
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // SCREEN_UV
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // RECT_DEPTH
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // LWI_PARAMS
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        screenRectData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );

        /*
        // size: 1216
        uniform CB_OBJ_MATERIAL_DATA
        {
            ivec4 OBJ_GLT_UVSET_INDICES[1];	// padding 0, size 16
            vec4 OBJ_LAYER_TILING[2];	// padding 16, size 32
            vec4 OBJ_LAYER_TILING_BASE_INV[1];	// padding 48, size 16
            vec4 OBJ_GLT_TRANSP_VC_MASK[2];	// padding 64, size 32
            vec4 OBJ_MTLBLEND_LAYER_CONST[64];	// padding 96, size 1024
            vec4 OBJ_PARALLAX_SECOND_VC_SWZ[1];	// padding 1120, size 16
            vec4 OBJ_PARALLAX_FLATTEN_VC_SWZ[1];	// padding 1136, size 16
            vec4 OBJ_COMPR_VERT_OFFSET[1];	// padding 1152, size 16
            vec4 OBJ_COMPR_VERT_SCALE[1];	// padding 1168, size 16
            vec4 OBJ_COMPR_TEX[2];	// padding 1184, size 32
        };
        */

        const materialData = new THREE.UniformsGroup();
        materialData.setName( 'CB_OBJ_MATERIAL_DATA' );
        // OBJ_GLT_UVSET_INDICES
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_LAYER_TILING
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_LAYER_TILING_BASE_INV
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_GLT_TRANSP_VC_MASK
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_MTLBLEND_LAYER_CONST
        for (let i = 0; i < 64; ++ i)
            materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_PARALLAX_SECOND_VC_SWZ
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_PARALLAX_FLATTEN_VC_SWZ
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_COMPR_VERT_OFFSET
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_COMPR_VERT_SCALE
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // OBJ_COMPR_TEX
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        materialData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );

        /*
        uniform CB_SPLIT_DRAW_DATA
        {
            uvec4 VS_REG_COMMON_OBJ_DATA;	// padding 0, size 16
            vec4 VS_REG_COMMON_OBJ_WORLD_MATRIX_DEBUG[3];	// padding 16, size 48
        };
        */

        const splitDrawData = new THREE.UniformsGroup();
        splitDrawData.setName( 'CB_SPLIT_DRAW_DATA' );
        // VS_REG_COMMON_OBJ_DATA
        splitDrawData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // VS_REG_COMMON_OBJ_WORLD_MATRIX_DEBUG
        splitDrawData.add( new THREE.Uniform( new THREE.Vector4(1, 0, 0, 0) ) );
        splitDrawData.add( new THREE.Uniform( new THREE.Vector4(0, 1, 0, 0) ) );
        splitDrawData.add( new THREE.Uniform( new THREE.Vector4(0, 0, 1, 0) ) );

        
        /*
        uniform CB_COMMON_DYN
        {
            vec4 COMMON_LBUF_PARAMS[1];	// padding 0, size 16
            ivec4 PS_REG_REFLECTIONS_NELEM[1];	// padding 16, size 16
            ivec4 PS_REG_COMMON_FOG_PARAM_SET[1];	// padding 32, size 16
            vec4 COMMON_VIEW_POSITION[1];	// padding 48, size 16
            vec4 COMMON_VIEW_POSITION_PREV[1];	// padding 64, size 16
            vec4 COMMON_VIEWPROJ_MATRIX[4];	// padding 80, size 64
            vec4 COMMON_FPMODEL_VIEWPROJ_MATRIX[4];	// padding 144, size 64
            vec4 COMMON_FPMODEL_VIEWPROJ_MATRIX_PREV[4];	// padding 208, size 64
            vec4 COMMON_FPMODEL_ZSCALE[1];	// padding 272, size 16
            vec4 COMMON_VIEW_MATRIX[3];	// padding 288, size 48
            vec4 COMMON_FPMODEL_CORRECTION_MATRIX[4];	// padding 336, size 64
            vec4 COMMON_PROJ_MATRIX[4];	// padding 400, size 64
        };
        */
        
        this.uniformLayout['CB_COMMON_DYN'] = {};

        const commonDyn = new THREE.UniformsGroup();
        commonDyn.setName( 'CB_COMMON_DYN' );
        // COMMON_LBUF_PARAMS
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // PS_REG_REFLECTIONS_NELEM
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // PS_REG_COMMON_FOG_PARAM_SET
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_VIEW_POSITION
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_VIEW_POSITION_PREV
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_VIEWPROJ_MATRIX

        const COMMON_VIEWPROJ_MATRIX = [
            new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ),
            new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ),
            new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ),
            new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) )
        ];

        for (let i = 0; i < 4; ++ i)
            commonDyn.add( COMMON_VIEWPROJ_MATRIX[i] );

        this.uniformLayout['CB_COMMON_DYN']['COMMON_VIEWPROJ_MATRIX'] = COMMON_VIEWPROJ_MATRIX;

        // COMMON_FPMODEL_VIEWPROJ_MATRIX
        for (let i = 0; i < 4; ++ i)
            commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_FPMODEL_VIEWPROJ_MATRIX_PREV
        for (let i = 0; i < 4; ++ i)
            commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_FPMODEL_ZSCALE
        commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_VIEW_MATRIX
        for (let i = 0; i < 3; ++ i)
            commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_FPMODEL_CORRECTION_MATRIX
        for (let i = 0; i < 4; ++ i)
            commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        // COMMON_PROJ_MATRIX
        for (let i = 0; i < 4; ++ i)
            commonDyn.add( new THREE.Uniform( new THREE.Vector4(0, 0, 0, 0) ) );
        

       this.uniformGroups = [ screenRectData, materialData, splitDrawData, commonDyn ];
    }

    updateUniformsGroups() {
        const viewMatrix = this.camera.matrixWorldInverse;
        const projMatrix = this.camera.projectionMatrix;
        const viewprojMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix).transpose();
        const COMMON_VIEWPROJ_MATRIX = this.uniformLayout['CB_COMMON_DYN']['COMMON_VIEWPROJ_MATRIX'];
        (COMMON_VIEWPROJ_MATRIX[0].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 0);
        (COMMON_VIEWPROJ_MATRIX[1].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 4);
        (COMMON_VIEWPROJ_MATRIX[2].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 8);
        (COMMON_VIEWPROJ_MATRIX[3].value as THREE.Vector4).fromArray(viewprojMatrix.elements, 12);

    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);

        const passCount = this.props.material.getPassCount();

        this.scene.remove(...this.groups);
        this.groups = Array(passCount).fill(null).map(x => this.groups[0].clone(true));
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

            (material as any).uniformsGroups = this.uniformGroups;

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
        const timeline = this.props.timeline;
        const uniforms = this.uniforms;
        const controls = this.props.controls;

        let constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        this.updateUniformsGroups()
        
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
