/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { isString, verbose } from '@lib/common';
import { ControlValueType } from '@lib/fx/bundles/utils';
import { IMap } from '@lib/idl/IMap';
import { IConstanBufferField, ITechnique } from '@lib/idl/ITechnique';
import * as ipc from '@sandbox/ipc';
import { OrbitControls } from '@three-ts/orbit-controls';
import autobind from 'autobind-decorator';
import copy from 'copy-to-clipboard';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { toast } from 'react-semantic-toasts';
import * as THREE from 'three';
import { IUniform } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader';

import { ITimeline } from '@lib/fx/timeline';

import { Color, IPlaygroundControlsState, Vector2, Vector3, Vector4 } from '@sandbox/store/IStoreState';
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


export interface IDeps {
    models: IMap<THREE.Mesh[]>;
    textures: IMap<THREE.Texture>;
}


function GetAssetsTexturesPath() {
    return "./assets/textures";
}


export function GetAssetsTextures() {
    if (!ipc.isElectron()) {
        return [
            'saber-logo.png',
            'checker2x2.png'
        ];
    } else {
        const sandboxPath = path.dirname(currentPath());
        const texturePath = path.join(sandboxPath, GetAssetsTexturesPath());
        return fs.readdirSync(texturePath);
    }
}


function GetAssetsModelsPath() {
    return "./assets/models";
}

export const TEXTURE_PLACEHOLDER_WHITE_1X1 = createPlaceholderTexture(1, 1);

function controlToThreeValue(ctrl: ControlValueType, type: string, deps: IDeps): THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number | THREE.Texture {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
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
        case 'mesh':
            // nothing todo: meshes are not supported in vs/ps shaders
            return null;
        case 'texture2d':
            return deps.textures[ctrl as string] || TEXTURE_PLACEHOLDER_WHITE_1X1;
        case 'uint':
        case 'int':
        case 'float':
            return ctrl as Number;
        default:
            console.error('unsupported type found');
    }
    return null;
}

function storeThreeValue(num: number, type: string): number {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
    switch (type) {
        case 'float':
            return num;
        case 'int':
            dv.setInt32(0, num);
            return dv.getFloat32(0);
        case 'uint':
            dv.setUint32(0, num);
            return dv.getFloat32(0);
        default:
            console.error('unsupported type found');
    }
    return null;
}


function createPlaceholderTexture(width = 512, height = 512) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    const color = new THREE.Color(0xffffff);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    for (let i = 0; i < size; i++) {
        const stride = i * 4;

        data[stride] = r;
        data[stride + 1] = g;
        data[stride + 2] = b;
        data[stride + 3] = 255;
    }

    // used the buffer to create a DataTexture
    const texture = new THREE.DataTexture(data, width, height);
    texture.needsUpdate = true;
    return texture;
}


function currentPath() {
    if (window.navigator.platform.includes('Mac')) {
        return window.location.pathname;
    }
    return window.location.pathname.substr(1);
}

export function GetAssetsModels() {
    if (!ipc.isElectron()) {
        return [
            'cube.obj',
            'probe.obj'
        ];
    } else {
        const sandboxPath = path.dirname(currentPath());
        const texturePath = path.join(sandboxPath, GetAssetsModelsPath());
        return fs.readdirSync(texturePath).filter(fname => path.extname(fname) === '.obj');
    }
}


export function loadObjModel(name: string): Promise<THREE.Mesh[]> {
    const loader = new OBJLoader();
    return new Promise<THREE.Mesh[]>((resolve, reject) => {
        loader.load(
            `${GetAssetsModelsPath()}/${name}`,
            (group: THREE.Group) => {
                console.log(`model '${GetAssetsModelsPath()}/${name}.obj' is loaded.`);
                resolve(group.children as THREE.Mesh[]);
            },
            (xhr) => {
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}

export function loadTGATexture(name: string): Promise<THREE.DataTexture> {
    const loader = new TGALoader();
    return new Promise<THREE.DataTexture>((resolve, reject) => {
        loader.load(
            `${GetAssetsTexturesPath()}/${name}`,
            (texture: THREE.DataTexture) => {
                console.log(`texture '${GetAssetsTexturesPath()}/${name}' is loaded.`);
                resolve(texture);
            },
            (xhr) => {
                // console.log( `${GetAssetsTexturesPath()}/${name}` + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}

export function loadTexture(name: string): Promise<THREE.Texture> {
    if (path.extname(name) === '.tga') return loadTGATexture(name);

    const loader = new THREE.TextureLoader();
    return new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
            `${GetAssetsTexturesPath()}/${name}`,
            (texture: THREE.Texture) => {
                console.log(`texture '${GetAssetsTexturesPath()}/${name}' is loaded.`);
                resolve(texture);
            },
            (xhr) => {
                // console.log( `${GetAssetsTexturesPath()}/${name}` + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}



export function resolveExternalDependencies(
    preloadTextures: boolean,
    preloadMeshes: boolean,
    deps: IDeps,
    onComplete: (deps: IDeps) => void) {

    const geoms: Set<string> = new Set();
    const textures: Set<string> = new Set();

    if (preloadTextures) {
        // IP: quick solution - request all possible textures as sub resources
        // if resource requires at least one texture.
        GetAssetsTextures().forEach(fname => textures.add(fname));
    }

    if (preloadMeshes || true) {
        // IP: quick solution - request all possible textures as sub resources
        // if resource requires at least one texture.
        GetAssetsModels().forEach(fname => geoms.add(fname));
    }

    let depNum = 1;
    let tryFinish = () => {
        depNum--;
        if (depNum == 0) {
            onComplete(deps);
        }
    }

    for (let name of geoms.values()) {
        if (!deps.models[name]) {
            depNum++;
            loadObjModel(name).then(meshes => {
                deps.models[name] = meshes;
                tryFinish();
            });
        }
    }

    for (let name of textures.values()) {
        if (!deps.textures[name]) {
            depNum++;
            loadTexture(name).then(texture => {
                deps.textures[name] = texture;
                tryFinish();
            });
        }
    }

    tryFinish();
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

    protected deps: IDeps = {
        models: {},
        textures: {},
    };


    protected meshDebugDraw: IMap<boolean> = {};

    protected stateInitials(): IThreeSceneState {
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

        const hash = JSON.stringify(controls.controls) +
            JSON.stringify(controls.presets) +
            // IP: hack to handle update of textures
            JSON.stringify(Object.values(controls.values).filter(isString));

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
                case 'texture2d':
                    {
                        const list = GetAssetsTextures();
                        let def = controls.values[name] as string;
                        if (!list.includes(def)) {
                            def = list[0];
                        }
                        // override initial value if it does not suit available resources
                        gui.add(controls.values, name, list).setValue(def);
                    }
                    break;
                case 'mesh':
                    {
                        const list = GetAssetsModels();
                        let def = controls.values[name] as string;
                        if (!list.includes(def)) {
                            def = list[0];
                        }
                        // override initial value if it does not suit available resources
                        const folder = gui.addFolder(caption);
                        folder.add(controls.values, name, list).setValue(def);
                        
                        {
                            this.meshDebugDraw[name] = this.meshDebugDraw[name] || false;
                            folder.add(this.meshDebugDraw, name).name('show (debug)');
                        }
                        
                        folder.open();
                    }
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
        this.beginFrame();
        this.renderFrame();
        this.endFrame();
        this.frameId = requestAnimationFrame(this.animate);

        this.end();
    }


    protected beginFrame() { }
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


    // per pass x per buffer
    uniformGroups: THREE.UniformsGroup[][];

    uniforms: IMap<IUniform<THREE.Texture | THREE.Vector4 | THREE.Vector3 | THREE.Vector2 | Number>> = {
        elapsedTime: { value: 0 },
        elapsedTimeLevel: { value: 0 },
        // elapsedTimeThis: { value: 0 }
    };


    // todo: read buffers layout from reflection
    createUniformGroups(technique: ITechnique) {
        const passCount = technique.getPassCount();

        this.uniformGroups?.forEach(gs => gs.forEach(g => g.dispose()));
        this.uniformGroups = [];
        for (let p = 0; p < passCount; ++p) {
            const cbuffers = technique.getPass(p).getDesc().cbuffers;

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
        const deps = this.deps;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                uniforms[name] = { value: controlToThreeValue(val, ctrl.type, deps) };
            }
        }
    }


    updateUniformsGroups(technique: ITechnique) {
        const viewMatrix = this.camera.matrixWorldInverse;
        const projMatrix = this.camera.projectionMatrix;
        const viewprojMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix).transpose();

        const { clientWidth, clientHeight } = this.mount;

        const passCount = technique.getPassCount();
        const controls = this.props.controls;
        const deps = this.deps;

        const timeline = this.props.timeline;
        const constants = timeline.getConstants();

        for (let p = 0; p < passCount; ++p) {
            const cbuffers = technique.getPass(p).getDesc().cbuffers;
            for (let c = 0; c < cbuffers.length; ++c) {
                let cbuf = cbuffers[c];
                let group = this.uniformGroups[p][c];
                let { name, size, usage } = cbuf;

                switch (name) {
                    case 'AUTOGEN_CONTROLS':
                        {
                            for (let { name, padding } of cbuf.fields) {
                                const pos = (padding / 16) >>> 0;
                                const pad = (padding % 16) / 4;
                                const ctrl = controls.controls[name];
                                const val = controls.values[name];
                                if (['int', 'uint', 'float'].indexOf(ctrl.type) !== -1) {
                                    const num = storeThreeValue(controlToThreeValue(val, ctrl.type, deps) as number, ctrl.type);
                                    (group.uniforms[pos].value as THREE.Vector4).setComponent(pad, num);
                                } else {
                                    group.uniforms[pos].value = controlToThreeValue(val, ctrl.type, deps);
                                }
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
        const deps = this.deps;
        const constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let ctrl = controls.controls[name];
                if (uniforms[name])
                    uniforms[name].value = controlToThreeValue(val, ctrl.type, deps);
            }
        }
    }
}

export default ThreeScene;
