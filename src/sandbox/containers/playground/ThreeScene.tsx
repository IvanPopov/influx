/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { isDefAndNotNull } from '@lib/common';
import { Emitter } from '@sandbox/containers/playground/Pipeline';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import * as OrbitControls from 'three-orbitcontrols';
import { EPartFxPassGeometry } from '@lib/idl/IPartFx';

const vertexShader = `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec4 color;
attribute float size;
attribute vec3 offset;

varying vec4 vColor;

void main() {
    vColor = color;
    vec4 viewPos = modelViewMatrix * vec4(offset, 1.0) + vec4(position * size, 0.0);
    gl_Position = projectionMatrix * viewPos;
}
`;

const fragmentShader = `
precision highp float;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;

interface ITreeSceneProps {
    style: React.CSSProperties;
    emitter?: Emitter;
}

interface IThreeSceneState {
    emitter: Emitter;
    nParticles: number;
}

class Particle {
    position: THREE.Vector3;
    color: THREE.Color;
    alpha: number;
    size: number;
}


const statsStyleFix: React.CSSProperties = {
    position: 'absolute',
    color: 'white',
    padding: '2px 5px',
    fontFamily: 'consolas',
    fontSize: '10px',
    right: '0',
    lineHeight: '11px',
    textShadow: '0 0 1px grey'
};

const progressStyleFix: React.CSSProperties = {
    background: '#eee',
    borderRadius: '0'
};

class ThreeScene extends React.Component<ITreeSceneProps, IThreeSceneState> {

    state: IThreeSceneState = {
        emitter: null,
        nParticles: 0
    };

    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    pointCloud: THREE.Points;
    controls: OrbitControls;

    frameId: number;
    mount: HTMLDivElement;

    passes: {
        mesh: THREE.Mesh;
        geometry: THREE.InstancedBufferGeometry;
        instancedBuffer: THREE.InstancedInterleavedBuffer;
    }[];

    particles: Particle[];


    componentDidMount() {
        const width = this.mount.clientWidth;
        const height = this.mount.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xCCCCCC);

        this.createCamera(width, height);
        this.createRenderer(width, height);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;
        // temp solution in order to not moving text cursor during movement
        this.controls.enableKeys = false;

        this.createGridHelper();
        // this.createCube();

        this.addEmitter(this.props.emitter);
        this.start();

        window.addEventListener('resize', this.onWindowResize, false);

        // small hack for disabling arrow keys actings during the typing
        this.canvas.addEventListener('mouseover', e => { this.controls.enabled = true; });
        this.canvas.addEventListener('mouseout', e => { this.controls.enabled = false; });
        // this.canvas.addEventListener('keydown', e => { if (this.controls.enabled) e.stopPropagation() });
        // this.canvas.addEventListener('keyup', e => { if (this.controls.enabled) e.stopPropagation() });

        console.log('ThreeScene::componentDidMount()');
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    addEmitter(emitter: Emitter) {
        this.passes = [];

        if (!isDefAndNotNull(emitter)) {
            console.warn('no emitters found.');
            return;
        }

        emitter.passes.forEach((pass, i) => {
            const geometry = new THREE.InstancedBufferGeometry();

            //
            // Instance
            //

            let instanceGeometry: THREE.BufferGeometry = null;
            switch (pass.geometry) {
                case EPartFxPassGeometry.k_Box:
                    instanceGeometry = new THREE.BoxBufferGeometry();
                    break;
                case EPartFxPassGeometry.k_Sphere:
                    instanceGeometry = new THREE.SphereBufferGeometry(0.5);
                    break;
                case EPartFxPassGeometry.k_Cylinder:
                    instanceGeometry = new THREE.CylinderBufferGeometry(0.5, 0.5, 1.0);
                    break;
                case EPartFxPassGeometry.k_Line:
                case EPartFxPassGeometry.k_Billboard:
                default:
                    instanceGeometry = new THREE.PlaneBufferGeometry();
            }
            geometry.index = instanceGeometry.index;
            geometry.attributes.position = instanceGeometry.attributes.position;
            // geometry.attributes.uv = instanceGeometry.attributes.uv;

            //
            // Instanced data
            //

            // tslint:disable-next-line:max-line-length
            const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(pass.data.buffer, pass.data.byteOffset), pass.stride);
            instancedBuffer.setDynamic(true);

            // todo: remove hardcoded layout or check it's validity.
            geometry.addAttribute('offset', new THREE.InterleavedBufferAttribute(instancedBuffer, 3, 0));
            geometry.addAttribute('color', new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 3));
            geometry.addAttribute('size', new THREE.InterleavedBufferAttribute(instancedBuffer, 1, 7));
            geometry.maxInstancedCount = pass.length;


            const material = new THREE.RawShaderMaterial({
                uniforms: {},
                vertexShader,
                fragmentShader,
                transparent: true,
                blending: THREE.NormalBlending,
                depthTest: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
            this.passes.push({ mesh, geometry, instancedBuffer });
            console.log('emitter added.');
        });
    }


    createCamera(width, height) {
        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            10000
        );
        this.camera.position.z = 3;
        this.camera.position.y = 2;
        this.camera.position.x = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }


    createRenderer(width, height) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // this.renderer.setClearColor('#000000');
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.mount.appendChild(this.renderer.domElement);

        // FIXME: remove this ui hack
        this.renderer.domElement.style.borderBottomLeftRadius = '3px';
        this.renderer.domElement.style.borderBottomRightRadius = '3px';
    }


    createGridHelper() {
        const size = 10;
        const divisions = 10;

        const gridHelper = new THREE.GridHelper(size, divisions);
        this.scene.add(gridHelper);
    }

    @autobind
    onWindowResize() {
        this.camera.aspect = this.mount.clientWidth / this.mount.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
    }


    componentWillUnmount() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize, false);
        this.mount.removeChild(this.renderer.domElement);
    }


    start = () => {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate);
        }
    }


    stop = () => {
        cancelAnimationFrame(this.frameId);
    }


    animate = (time: number) => {
        const emitter = this.state.emitter;

        if (!emitter) {
            return;
        }

        const indicies = [];
        const v3 = new THREE.Vector3();
        const copy = new Float32Array(emitter.length * 8);

        for (let iPass = 0; iPass < this.passes.length; ++iPass) {
            const pass = this.passes[iPass];
            const emitPass = emitter.passes[iPass];

            // NOTE: yes, I understand this is a crappy and stupid brute force sorting,
            //       I hate javascript for that :/
            if (emitPass.sorting) {
                const f32 = pass.instancedBuffer.array as Float32Array;
                // const u8 = new Uint8Array(f32.buffer, f32.byteOffset);
                const nStride = emitPass.stride; // stride in floats
                // const temp = new Float32Array(nStride);

                for (let iPart = 0; iPart < emitPass.length; ++iPart) {
                    const offset = iPart * nStride;
                    const dist = v3.fromArray(f32, offset).distanceTo(this.camera.position);
                    indicies.push([iPart, dist]);
                }

                indicies.sort((a, b) => -a[1] + b[1]);

                for (let i = 0; i < indicies.length; ++i) {
                    const iFrom = indicies[i][0] * nStride;
                    const iTo = i * nStride;

                    // const to = f32.subarray(iTo, iTo + nStride);
                    const from = f32.subarray(iFrom, iFrom + nStride);

                    // temp.set(to);
                    // to.set(from);
                    // from.set(temp);

                    const copyTo = copy.subarray(iTo, iTo + nStride);
                    copyTo.set(from);
                }

                f32.set(copy);
            }

            pass.instancedBuffer.needsUpdate = true;
            pass.geometry.maxInstancedCount = emitter.passes[iPass].length;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(this.animate);

        this.setState({ nParticles: emitter.length });
    }

    shouldComponentUpdate(nextProps: ITreeSceneProps, nexState) {
        return this.state.emitter !== nextProps.emitter || this.state.nParticles !== nexState.nParticles;
    }

    // tslint:disable-next-line:member-ordering
    static getDerivedStateFromProps(props: ITreeSceneProps, state) {
        if (state.emitter === props.emitter) {
            return null;
        }

        return { emitter: props.emitter };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.emitter === this.state.emitter) {
            return;
        }

        this.passes.forEach(pass => {
            this.scene.remove(pass.mesh);
            console.log('emitter removed.');
        });

        if (this.props.emitter) {
            this.addEmitter(this.props.emitter);
        }
    }


    render() {
        // console.log('ThreeScene::render()');
        return (
            <div
                style={ this.props.style }
                ref={ (mount) => { this.mount = mount; } }
            >
                <Progress
                    value={ this.state.nParticles }
                    total={ this.state.emitter.capacity }
                    attached='top'
                    size='medium'
                    indicating
                    style={ progressStyleFix }
                />
                <div style={ statsStyleFix }>
                    <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;count: { this.state.nParticles }</span>
                    <br />
                    <span>simulation: CPU</span>
                </div>
            </div>
        );
    }
}

export default ThreeScene;
