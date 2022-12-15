/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { verbose } from '@lib/common';
import { OrbitControls } from '@three-ts/orbit-controls';
import autobind from 'autobind-decorator';
import copy from 'copy-to-clipboard';
import * as React from 'react';
import { toast } from 'react-semantic-toasts';
import * as THREE from 'three';

import { ITimeline } from '@lib/fx/timeline';

import { Color, IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import { GUI } from 'dat.gui';

// must be imported last
import { cloneValue, colorToUint, encodeControlsToString, uintToColor } from '@lib/fx/bundles/utils';

export interface ITreeSceneProps {
    style?: React.CSSProperties;
    timeline: ITimeline;
    controls?: IPlaygroundControlsState;

    canvasRef?: (canvas: HTMLCanvasElement) => void;
}

export interface IThreeSceneState {
    controls: string; // hash
    fps: { min: number, max: number, value: number };
}


class ThreeScene<P extends ITreeSceneProps, S extends IThreeSceneState> extends React.Component<P, S> {
    // fps stats
    private frames = 0;
    private prevTime = 0;

    protected renderer: THREE.WebGLRenderer;
    protected camera: THREE.PerspectiveCamera;
    protected scene: THREE.Scene;
    protected fog: THREE.FogBase;
    protected controls: OrbitControls;
    protected mount: HTMLDivElement;

    // animation loop
    protected frameId: number;
    protected gui: GUI = null;

    protected preset: string = null;


    stateInitials(): IThreeSceneState {
        return {
            controls: null,
            fps: {
                min: 0,
                max: 0,
                value: 0
            }
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

        this.createGUI(this.props.controls);

        this.renderer = this.createRenderer(width, height);
        this.renderer.setSize(width, height - 3);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.id = "playground-main-canvas";
        // FIXME: remove this ui hack
        this.renderer.domElement.style.borderBottomLeftRadius = '3px';
        this.renderer.domElement.style.borderBottomRightRadius = '3px';
        this.mount.appendChild(this.renderer.domElement);

        this.props.canvasRef?.(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;
        // temp solution in order to not moving text cursor during movement
        this.controls.enableKeys = false;

        if (grid)
            this.createGridHelper();

        // run rendering loop
        this.start();

        window.addEventListener('resize', this.onWindowResize, false);

        // small hack for disabling arrow keys actings during the typing
        this.canvas.addEventListener('mouseover', e => { this.controls.enabled = true; });
        this.canvas.addEventListener('mouseout', e => { this.controls.enabled = false; });
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
    }


    componentWillUnmount() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize, false);
        this.mount.removeChild(this.renderer.domElement);

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
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true /* to be able to save screenshots */ });
        return renderer;
    }


    private removeGUI() {
        if (this.gui) {
            this.mount.removeChild(this.gui.domElement);
            this.gui.destroy();
            this.gui = null;
        }
    }


    private createGUI(controls: IPlaygroundControlsState) {
        if (!controls) {
            return;
        }

        const hash = JSON.stringify(controls.controls) + JSON.stringify(controls.presets);

        if (this.state.controls != hash) {
            this.removeGUI();
        }

        if (Object.keys(controls.values).length == 0) {
            // empty controls are valid ?
            return null;
        }

        if (this.gui) {
            // nothing todo, same controls have been requested
            return;
        }

        // remove active preset if it doesn't exist anymore
        if (this.preset && !controls.presets.find(p => p.name === this.preset)) {
            this.preset = null;
        }

        const gui = new GUI({ autoPlace: false });

        for (let name in controls.values) {
            let control = controls.controls[name];
            let viewType = control.properties["__type"] as string || control.type;
            let caption = control.properties["__caption"] as string || control.name;
            let ctrl = null;
            switch (viewType) {
                case 'int':
                case 'uint':
                case 'float':
                    ctrl = gui.add(controls.values, name);
                    break;
                case 'slider':
                    let min = control.properties["__min"] as number;
                    let max = control.properties["__max"] as number;
                    let step = control.properties["__step"] as number;
                    ctrl = gui.add(controls.values, name, min, max, step);
                    break;
                case 'color':
                    let colorFolder = gui.addFolder(caption);
                    let clr = controls.values[name] as Color;
                    colorFolder.addColor({ color: colorToUint(clr) }, 'color').onChange(value => uintToColor(value, clr));
                    colorFolder.add({ opacity: clr.a }, 'opacity', 0, 1).onChange(value => clr.a = value);
                    colorFolder.open();
                    break;
                case 'float2':
                    let vec2Folder = gui.addFolder(caption);
                    vec2Folder.add(controls.values[name], 'x');
                    vec2Folder.add(controls.values[name], 'y');
                    vec2Folder.open();
                    break;
                case 'float3':
                    let vec3Folder = gui.addFolder(caption);
                    vec3Folder.add(controls.values[name], 'x');
                    vec3Folder.add(controls.values[name], 'y');
                    vec3Folder.add(controls.values[name], 'z');
                    vec3Folder.open();
                    break;
                case 'float4':
                    let vec4Folder = gui.addFolder(caption);
                    vec4Folder.add(controls.values[name], 'x');
                    vec4Folder.add(controls.values[name], 'y');
                    vec4Folder.add(controls.values[name], 'z');
                    vec4Folder.add(controls.values[name], 'w');
                    vec4Folder.open();
                    break;
            }

            if (ctrl) {
                ctrl.name(caption);
            }
        }

        if (controls.presets?.length) {
            gui.add(this, 'preset', ['', ...controls.presets.map(p => p.name)]).onChange(name => {
                console.log('apply preset', name);
                const preset = controls.presets.find(p => p.name == name);
                if (preset) {
                    preset.data.forEach(entry => {
                        let control = controls.controls[entry.name];
                        if (control) {
                            controls.values[entry.name] = cloneValue(entry.type, entry.value);
                        }
                    });
                    setTimeout(() => {
                        this.removeGUI();
                        this.createGUI(this.props.controls);
                    }, 10);
                }
            });
        }

        const copyToClipboard = '<center>copy to clipboard</center>';
        // todo: show notification
        gui.add({
            [copyToClipboard]: () => {
                copy(encodeControlsToString(controls), { debug: true });
                toast({
                    size: 'tiny',
                    type: 'info',
                    title: `Copied to clipboard`,
                    animation: 'bounce',
                    time: 2000
                });
            }
        }, copyToClipboard);

        // gui.close();
        gui.open();

        this.mount.appendChild(gui.domElement);

        gui.domElement.style.position = 'absolute';
        gui.domElement.style.top = '2px';

        this.gui = gui;
        this.setState({ controls: hash });
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


    componentDidUpdate(prevProps, prevState) {
        this.createGUI(this.props.controls);
    }


    @autobind
    protected animate(time: DOMHighResTimeStamp) {
        this.begin();

        this.controls.update();
        this.fillScene(time);
        this.renderScene(time);
        this.cleanScene(time);
        this.frameId = requestAnimationFrame(this.animate);

        this.end();
    }


    protected fillScene(time: DOMHighResTimeStamp) { }
    protected cleanScene(time: DOMHighResTimeStamp) { }

    protected renderScene(time: DOMHighResTimeStamp) { this.renderer.render(this.scene, this.camera); }

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
