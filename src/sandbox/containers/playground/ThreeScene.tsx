/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */

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

    particles: Particle[];

    componentDidMount() {
        const width = this.mount.clientWidth;
        const height = this.mount.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xCCCCCC);

        this.createCamera(width, height);
        this.createRenderer(width, height);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.createGridHelper();
        // this.createCube();
        this.createPointCloud();

        this.start();

        window.addEventListener('resize', this.onWindowResize, false);
    }

    createPointCloud() {
        this.particles = [];
        const count = 100;

        for (let i = 0; i < count; ++ i) {
            const x = (Math.random() - 0.5);
            const y = (Math.random() - 0.5);
            const z = (Math.random() - 0.5);

            const position = new THREE.Vector3(x, y, z);
            const color = new THREE.Color();
            const size = 0.1;
            const alpha = 1;
            color.setHSL(i / count, 1.0, 0.5);

            this.particles.push({ position, color, alpha, size });
        }


        const geometry = new THREE.BufferGeometry();
        const data = new Float32Array(this.particles.length * (
            3 +  // vertex xyz
            4 +  // color  rgba
            1    // size
        ));

        const buffer =  new THREE.InterleavedBuffer(data, 8);

        for (let i = 0; i < this.particles.length; ++i) {
            const i8 = i * 8;
            const particle = this.particles[i];

            data[i8    ] = particle.position.x;
            data[i8 + 1] = particle.position.y;
            data[i8 + 2] = particle.position.z;
            data[i8 + 3] = particle.color.r;
            data[i8 + 4] = particle.color.g;
            data[i8 + 5] = particle.color.b;
            data[i8 + 6] = particle.alpha;
            data[i8 + 7] = particle.size;
        }

        geometry.addAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
        geometry.addAttribute('color', new THREE.InterleavedBufferAttribute(buffer, 4, 3));
        geometry.addAttribute('size', new THREE.InterleavedBufferAttribute(buffer, 1, 7));
        geometry.setDrawRange(0, this.particles.length);

        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false
        });

        this.pointCloud = new THREE.Points(geometry, material);
        this.scene.add(this.pointCloud);
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
        const geometry = this.pointCloud.geometry as THREE.BufferGeometry;
        const positions = geometry.attributes['position'] as THREE.InterleavedBufferAttribute;

        for (let i = 0; i < this.particles.length; ++ i) {
            const particle = this.particles[i];
            const pos = particle.position;
            // positions.setXYZ(i, pos.x, pos.y + Math.sin(time * 0.001), pos.z);
            // positions.data.needsUpdate = true;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(this.animate);
    }


    render() {
        return (
            <div
                style={ this.props.style }
                ref={ (mount) => { this.mount = mount; } }
            />
        );
    }
}

export default ThreeScene;
