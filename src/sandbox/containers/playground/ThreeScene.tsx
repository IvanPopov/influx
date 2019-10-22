/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */

import { isDefAndNotNull } from '@lib/common';
import { Emitter } from '@sandbox/containers/playground/Pipeline';
import autobind from 'autobind-decorator';
import * as React from 'react';
import * as THREE from 'three';
import * as OrbitControls from 'three-orbitcontrols';

const vertexShader = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec4 color;
attribute float size;

varying vec3 vPosition;
varying vec4 vColor;

void main()	{
    vPosition = position;
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fragmentShader = `
precision mediump float;
precision mediump int;
varying vec3 vPosition;
varying vec4 vColor;

void main()	{
    vec4 color = vec4( vColor );
    gl_FragColor = color;
}
`;

interface ITreeSceneProps {
    style: React.CSSProperties;
    emitter?: Emitter;
}

class Particle {
    position: THREE.Vector3;
    color: THREE.Color;
    alpha: number;
    size: number;
}

class ThreeScene extends React.Component<ITreeSceneProps> {
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    pointCloud: THREE.Points;
    controls: OrbitControls;

    frameId: number;
    mount: HTMLDivElement;

    emitter: Emitter;
    passes: THREE.Points[];

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
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    addEmitter(emitter: Emitter) {
        this.emitter = null;
        this.passes = [];

        if (!isDefAndNotNull(emitter)) {
            console.warn('no emitters found.');
            return;
        }

        this.emitter = emitter;

        emitter.passes.forEach((pass, i) => {
            const buffer = new THREE.InterleavedBuffer(new Float32Array(pass.data.buffer, pass.data.byteOffset), pass.stride);
            const geometry = new THREE.BufferGeometry();
            // todo: remove hardcoded layout or check it's validity.
            geometry.addAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
            geometry.addAttribute('color', new THREE.InterleavedBufferAttribute(buffer, 4, 3));
            geometry.addAttribute('size', new THREE.InterleavedBufferAttribute(buffer, 1, 7));
            geometry.setDrawRange(0, pass.length);

            const material = new THREE.RawShaderMaterial({
                uniforms: {},
                vertexShader,
                fragmentShader,
                transparent: true,
                blending: THREE.NormalBlending,
                depthTest: false
            });

            const points = new THREE.Points(geometry, material);
            this.scene.add(points);
            this.passes.push(points);
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
        const size = 5;
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
        for (const pass of this.passes) {
            const geometry = pass.geometry as THREE.BufferGeometry;
            for (const attrName in geometry.attributes) {
                const attr = geometry.attributes[attrName] as THREE.InterleavedBufferAttribute;
                attr.data.needsUpdate = true;
            }
            geometry.setDrawRange(0, this.emitter.length); // todo: use per pass values
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(this.animate);
    }

    shouldComponentUpdate(nextProps: ITreeSceneProps) {
        return this.emitter !== nextProps.emitter;
    }

    componentDidUpdate(prevProps, prevState) {
        this.emitter = null;
        this.passes.forEach(pass => {
            this.scene.remove(pass);
            console.log('emitter removed.');
        });

        if (this.props.emitter) {
            this.addEmitter(this.props.emitter);
        }
    }

    render() {
        console.log('ThreeScene::render()');
        return (
            <div
                style={ this.props.style }
                ref={ (mount) => { this.mount = mount; } }
            />
        );
    }
}

export default ThreeScene;
