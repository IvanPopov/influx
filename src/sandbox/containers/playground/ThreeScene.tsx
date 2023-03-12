import { verbose } from '@lib/common';
import { ITimeline } from '@lib/fx/timeline';
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import { OrbitControls } from '@three-ts/orbit-controls';
import autobind from 'autobind-decorator';
import * as React from 'react';
import * as THREE from 'three';



export interface ITreeSceneProps {
    style?: React.CSSProperties;
    timeline: ITimeline;

    canvasRef?: (canvas: HTMLCanvasElement) => void;
}


export interface IThreeSceneState {
    fps: { min: number, max: number, value: number };
}


class ThreeScene<P extends ITreeSceneProps, S extends IThreeSceneState> extends React.Component<P, S> {
    protected frames = 0;      // fps stats
    protected prevTime = 0;    // fps stats
    protected frameId: number; // animation loop

    protected renderer: THREE.WebGLRenderer;
    protected camera: THREE.PerspectiveCamera;
    protected scene: THREE.Scene;
    protected fog: THREE.FogBase;
    protected orbitControls: OrbitControls;
    protected mount: HTMLDivElement;


    protected stateInitials(): IThreeSceneState {
        return {
            fps: { min: 0, max: 0, value: 0 }
        };
    }


    componentDidMount({ grid, fog } = { grid: true, fog: true }) {
        const width = this.mount.clientWidth;
        const height = this.mount.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xCCCCCC);
        this.camera = this.createCamera(width, height);
        this.fog = null;

        if (fog) {
            const color = 0xCCCCCC;  // white
            this.fog = new THREE.FogExp2(color, 0.035);
        }

        this.scene.fog = this.fog;
        // this.scene.backgroundBlurriness = 0.3;

        this.renderer = this.createRenderer(width, height);
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.id = "playground-main-canvas";
        // FIXME: remove this ui hack
        this.renderer.domElement.style.borderBottomLeftRadius = '3px';
        this.renderer.domElement.style.borderBottomRightRadius = '3px';
        this.mount.appendChild(this.renderer.domElement);

        this.props.canvasRef?.(this.renderer.domElement);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enabled = false;
        // temp solution in order to not moving text cursor during movement
        this.orbitControls.enableKeys = false;

        if (grid) {
            this.createGridHelper();
        }

        window.addEventListener('resize', this.onWindowResize, false);

        // small hack for disabling arrow keys actings during the typing
        this.canvas.addEventListener('mouseover', e => { this.orbitControls.enabled = true; });
        this.canvas.addEventListener('mouseout', e => { this.orbitControls.enabled = false; });
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
    }


    componentWillUnmount() {
        this.stop();
        this.mount.removeChild(this.renderer.domElement);
        window.removeEventListener('resize', this.onWindowResize, false);
        document.removeEventListener("visibilitychange", this.handleVisibilityChange, false);
    }


    @autobind
    handleVisibilityChange() {
        const timeline = this.props.timeline;
        if (document["hidden"]) {
            timeline.pause();
            verbose('pause timeline');
        } else {
            timeline.unpause();
            verbose('unpause timeline');
        }
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }


    private createCamera(width, height): THREE.PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            10000
        );
        camera.position.z = 3;
        camera.position.y = 2;
        camera.position.x = 2;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        return camera;
    }


    protected createRenderer(width, height): THREE.WebGLRenderer {
        // let WEBGL_DEBUG = false;
        // if (WEBGL_DEBUG) {
        //     let WebGLDebugUtils = require('webgl-debug');

        //     function throwOnGLError(err, funcName, args) {
        //         throw WebGLDebugUtils.glEnumToString(err)
        //         + "was caused by call to "
        //         + funcName;
        //     };

        //     const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas') as HTMLCanvasElement;
        //     canvas.style.display = 'block';

        //     const contextAttributes: WebGLContextAttributes = {
        //         alpha: true,
        //         antialias: true,
        //         depth: true,
        //         failIfMajorPerformanceCaveat: false,
        //         powerPreference: "default",
        //         premultipliedAlpha: true,
        //         preserveDrawingBuffer: true,
        //         stencil: true
        //     };

        //     let context = canvas.getContext("webgl2", contextAttributes);
        //     // context = WebGLDebugUtils.makeDebugContext(context, throwOnGLError);
        //     const renderer = new THREE.WebGLRenderer({
        //         context,
        //         canvas,
        //         antialias: true,
        //         preserveDrawingBuffer: true /* to be able to save screenshots */
        //     });
        //     // console.log(context, renderer.getContext());
        //     return renderer;
        // }
        
        return new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true /* to be able to save screenshots */
        });
    }
    

    private createGridHelper(size = 200, divisions = 200) {
        const gridHelper = new THREE.GridHelper(size, divisions);
        this.scene.add(gridHelper);
    }


    @autobind
    onWindowResize() {
        this.camera.aspect = this.mount.clientWidth / this.mount.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
    }



    start = () => {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate);
        }
    }


    stop = () => {
        cancelAnimationFrame(this.frameId);
    }


    protected begin() {
        // nothing todo
    }


    protected end() {
        this.frames++;
        const time = (performance || Date).now();

        if (time > this.prevTime + 1000) {
            this.updateFps((this.frames * 1000) / (time - this.prevTime), 100);
            this.prevTime = time;
            this.frames = 0;
        }

        return time;
    }


    private updateFps(value, maxValue) {
        const fps = this.state.fps;
        const min = Math.min(fps.min, value);
        const max = Math.max(fps.max, value);
        this.setState({ fps: { min, max, value } });
    }


    @autobind
    protected animate(time: DOMHighResTimeStamp) {
        this.begin();

        this.orbitControls.update();
        this.beginFrame();
        this.renderFrame();
        this.endFrame();
        this.frameId = requestAnimationFrame(this.animate);

        this.end();
    }


    protected beginFrame() {
        const timeline = this.props.timeline;
        timeline.tick();
    }

    protected renderFrame() { this.renderer.render(this.scene, this.camera); }
    protected endFrame() { }


    render() {
        return (
            <div
                style={this.props.style}
                ref={(mount) => { this.mount = mount; }}
            />
        );
    }

}

export default ThreeScene;
