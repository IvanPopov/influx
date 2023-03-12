import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
// import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader';
import { ACESFilmicToneMappingShader } from 'three/examples/jsm/shaders/ACESFilmicToneMappingShader';

import { isString } from '@lib/common';
import autobind from 'autobind-decorator';
import * as THREE from 'three';
import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';

type Tonemap = "No"| "Linear"| "Reinhard"| "Cineon"| "ACESFilmic"| "Custom";
type TextureEncoding = "Linear" | "sRGB";
interface HdrParams {
    // outputEncoding: TextureEncoding;
    // toneMappingExposure: number;
    // toneMappingType: Tonemap;
    bloom: boolean;
    bloomStrength: number;
    bloomThreshold: number;
    bloomRadius: number;
}

function dumpHdrParams(params: HdrParams) {
    Object.keys(params).forEach(prop => localStorage[prop] = params[prop]);
}

function size(div: HTMLDivElement, pixelRatio: number) {
    return {
        width: (div.clientWidth * pixelRatio),// + 0.5) >>> 0,
        height: (div.clientHeight * pixelRatio),// + 0.5) >>> 0,
    }
}


function restoreHdrParams(): HdrParams {
    const params: HdrParams = {        
        // outputEncoding: 'Linear',
        // toneMappingType: 'Linear',
        // toneMappingExposure: 1.0,
        bloom: false,
        bloomStrength: 2.0,
        bloomThreshold: 1.0,
        bloomRadius: 1.0,
    };

    // params.outputEncoding = (localStorage.outputEncoding || params.outputEncoding) as TextureEncoding;
    // params.toneMappingType = (localStorage.toneMappingType || params.toneMappingType) as Tonemap;
    // params.toneMappingExposure = Number(localStorage.toneMappingExposure || params.toneMappingExposure);
    params.bloom = isString(localStorage.bloom) ? localStorage.bloom === 'true' : params.bloom;
    params.bloomThreshold = Number(localStorage.bloomThreshold || params.bloomThreshold);
    params.bloomStrength = Number(localStorage.bloomStrength || params.bloomStrength);
    params.bloomRadius = Number(localStorage.bloomRadius || params.bloomRadius);
    return params;
}

// var ACESFilmicToneMappingShader = {
// 	uniforms: {
// 		'tDiffuse': { value: null },
// 		'exposure': { value: 1.0 }
// 	},

// 	vertexShader: [
// 		'varying vec2 vUv;',
// 		'void main() {',
// 		'	vUv = uv;',
// 		'	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
// 		'}'
// 	].join( '\n' ),

// 	fragmentShader: [
// 		'#define saturate(a) clamp( a, 0.0, 1.0 )',
// 		'uniform sampler2D tDiffuse;',
// 		'uniform float exposure;',
// 		'varying vec2 vUv;',
// 		'void main() {',
// 		'	vec4 tex = texture2D( tDiffuse, vUv );',
// 		'	tex.rgb *= exposure;', // pre-exposed, outside of the tone mapping function
// 		'	gl_FragColor = vec4( ACESFilmicToneMapping( tex.rgb ), tex.a );',
// 		'}'
// 	].join( '\n' )
// };

// const GammaCorrectionShader = {
// 	uniforms: {
// 		'tDiffuse': { value: null }
// 	},
// 	vertexShader: /* glsl */`
// 		varying vec2 vUv;
// 		void main() {
// 			vUv = uv;// 			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
// 		}`,
// 	fragmentShader: /* glsl */`
// 		uniform sampler2D tDiffuse;
// 		varying vec2 vUv;
// 		void main() {
// 			vec4 tex = texture2D( tDiffuse, vUv );
// 			gl_FragColor = vec4( pow(tex.rgb, vec3(1.0 / 1.5)), tex.a );
// 		}`
// };


class HDRScene<P extends ITreeSceneProps, S extends IThreeSceneState> extends ThreeScene<P, S> {
    protected composer: EffectComposer;
    protected hdrControls: GUI;
    protected hdrParams: HdrParams;

    protected override createRenderer(width, height): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true // screenshots
        });
        // affect only grid rendering and predefined materials
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( width, height );
        return renderer;
    }
    
    
    private createSceneControls(bloomPass: UnrealBloomPass, renderer: THREE.WebGLRenderer): GUI {
        const params = this.hdrParams;
        const gui = new GUI({ autoPlace: false });
        
        // gui.name = 'Tonemapping';
        GUI.TEXT_OPEN = 'Show Options';
        
        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.bottom = '20px';
        
        let tonemap = gui.addFolder('tonemapping');
        
        
        // tonemap.add(params, 'toneMappingType', [ "No", "Linear", "Reinhard", "Cineon", "ACESFilmic" ])
        // .name('tonemapping').onChange((value) => {
        //     this.renderer.toneMapping = THREE[`${value}ToneMapping`];
        //     dumpHdrParams(this.hdrParams);
        // });
        
        // tonemap.add(params, 'outputEncoding', [ "Linear", "sRGB" ] as TextureEncoding[])
        // .name('output encoding').onChange((value) => {
        //     this.renderer.outputEncoding = THREE[`${value}Encoding`];
        //     dumpHdrParams(this.hdrParams);
        // });
        
        // tonemap.add(params, 'toneMappingExposure', 0.1, 2.0).onChange((value) => {
        //     renderer.toneMappingExposure = Math.pow(value, 4.0);
        //     dumpHdrParams(this.hdrParams);
        // }).name('exposure');

        tonemap.add(params, 'bloom').onChange(value => {
            dumpHdrParams(this.hdrParams);
        });

        tonemap.add(params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
            bloomPass.threshold = Number(value);
            dumpHdrParams(this.hdrParams);
        });

        tonemap.add(params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
            bloomPass.strength = Number(value);
            dumpHdrParams(this.hdrParams);
        });

        tonemap.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange((value) => {
            bloomPass.radius = Number(value);
            dumpHdrParams(this.hdrParams);
        });

        tonemap.open();
        gui.close();

        return gui;
    }


    componentDidMount() {
        super.componentDidMount({ grid: true, fog: true });

        // this.scene.background = new THREE.Color(0x333333);
        // this.fog.color = new THREE.Color(0x333333);
        
        const scene = this.scene;
        const camera = this.camera;
        const renderer = this.renderer;
        const mount = this.mount;

        const pixelRatio = this.renderer.getPixelRatio();
        const { width, height } = size(mount, pixelRatio);

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
        const smaaPass = new SMAAPass(width, height);

       
        this.hdrParams = restoreHdrParams();
        // renderer.outputEncoding = THREE[`${this.hdrParams.outputEncoding}Encoding`];
        // renderer.toneMapping = THREE[`${this.hdrParams.toneMappingType}ToneMapping`];
        // renderer.toneMappingExposure = this.hdrParams.toneMappingExposure;

        bloomPass.threshold = this.hdrParams.bloomThreshold;
        bloomPass.strength = this.hdrParams.bloomStrength;
        bloomPass.radius = this.hdrParams.bloomRadius;

        const parameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        };
        
        const renderTarget = new THREE.WebGLRenderTarget(width, height, parameters);
        const composer = new EffectComposer(renderer, renderTarget);

        composer.setPixelRatio(pixelRatio);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        composer.addPass(smaaPass);
        // composer.addPass(new ShaderPass(ACESFilmicToneMappingShader));
        // composer.addPass(new ShaderPass(GammaCorrectionShader));

        this.hdrControls = this.createSceneControls(bloomPass, renderer);
        this.composer = composer;
    }



    protected renderFrame() {
        if (this.hdrParams.bloom) {
            this.composer.render();
        } else {
            super.renderFrame();
        }
    }


    @autobind
    onWindowResize() {
        super.onWindowResize(); // << update renderer size and camera aspect
        const { mount, renderer } = this;
        const { width, height } = size(mount, renderer.getPixelRatio());
        this.composer.setSize(width, height);
        // todo: change resolution of bloom pass here?
    }
}

export default HDRScene;
