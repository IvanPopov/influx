import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import { isString } from '@lib/common';
import autobind from 'autobind-decorator';
import * as THREE from 'three';
import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';

interface HdrParams {
    bloom: boolean;
    toneMappingExposure: number;
    bloomStrength: number;
    bloomThreshold: number;
    bloomRadius: number;
}

function dumpHdrParams(params: HdrParams) {
    Object.keys(params).forEach(prop => localStorage[prop] = params[prop]);
}


function restoreHdrParams(): HdrParams {
    const params = {        
        bloom: false,
        toneMappingExposure: 1.0,
        bloomStrength: 0.3,
        bloomThreshold: 0.0,
        bloomRadius: 1.0
    };

    params.bloom = isString(localStorage.bloom) ? localStorage.bloom === 'true' : params.bloom;
    params.toneMappingExposure = Number(localStorage.toneMappingExposure || params.toneMappingExposure);
    params.bloomThreshold = Number(localStorage.bloomThreshold || params.bloomThreshold);
    params.bloomStrength = Number(localStorage.bloomStrength || params.bloomStrength);
    params.bloomRadius = Number(localStorage.bloomRadius || params.bloomRadius);
    return params;
}


class HDRScene<P extends ITreeSceneProps, S extends IThreeSceneState> extends ThreeScene<P, S> {
    protected composer: EffectComposer;
    protected hdrControls: GUI;
    protected hdrParams: HdrParams;

    protected override createRenderer(width, height): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true // screenshots
        });
        renderer.toneMapping = THREE.ReinhardToneMapping;
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

        tonemap.add(params, 'bloom').onChange(value => {
            dumpHdrParams(this.hdrParams);
        });

        tonemap.add(params, 'toneMappingExposure', 0.1, 2.0).onChange((value) => {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
            dumpHdrParams(this.hdrParams);
        }).name('exposure');

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

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

        this.hdrParams = restoreHdrParams();

        renderer.toneMappingExposure = this.hdrParams.toneMappingExposure;
        bloomPass.threshold = this.hdrParams.bloomThreshold;
        bloomPass.strength = this.hdrParams.bloomStrength;
        bloomPass.radius = this.hdrParams.bloomRadius;

        this.composer = new EffectComposer(renderer);
        const composer = this.composer;
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        this.hdrControls = this.createSceneControls(bloomPass, renderer);
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
        super.onWindowResize();
        const { clientWidth, clientHeight } = this.mount;
        this.composer.setSize(clientWidth, clientHeight);
    }
}

export default HDRScene;
