/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { assert, isDefAndNotNull, verbose } from '@lib/common';
import { EPartFxPassGeometry } from '@lib/idl/IPartFx';
import { Emitter, IPipeline, Pass } from '@sandbox/containers/playground/Pipeline';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import * as OrbitControls from 'three-orbitcontrols';

const $vertexShader = `
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

const $fragmentShader = `
precision highp float;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;

interface ITreeSceneProps {
    style: React.CSSProperties;
    pipeline?: IPipeline;
}

interface IThreeSceneState {
    pipeline: IPipeline;
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
        pipeline: null,
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
        mesh: THREE.Mesh | THREE.LineSegments;
        instancedBuffer: THREE.InstancedInterleavedBuffer | THREE.InterleavedBuffer;
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

        this.addEmitter(this.props.pipeline.emitter);
        this.start();

        window.addEventListener('resize', this.onWindowResize, false);

        // small hack for disabling arrow keys actings during the typing
        this.canvas.addEventListener('mouseover', e => { this.controls.enabled = true; });
        this.canvas.addEventListener('mouseout', e => { this.controls.enabled = false; });
        // this.canvas.addEventListener('keydown', e => { if (this.controls.enabled) e.stopPropagation() });
        // this.canvas.addEventListener('keyup', e => { if (this.controls.enabled) e.stopPropagation() });

        // console.log('ThreeScene::componentDidMount()');
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    addPassLine(pass: Pass) {
        const geometry = new THREE.BufferGeometry();
        const instancedBuffer = new THREE.InterleavedBuffer(new Float32Array(pass.data.buffer, pass.data.byteOffset), pass.stride);

        //
        // Instance data
        //

        pass.instanceLayout.forEach(desc => {
            const interleavedAttr = new THREE.InterleavedBufferAttribute(instancedBuffer, desc.size, desc.offset);
            geometry.addAttribute(desc.attrName, interleavedAttr);
        });


        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: pass.vertexShader,
            fragmentShader: pass.pixelShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false
            // linewidth: 5
        });

        // geometry.setIndex(Array(pass.capacity).fill(0).map((x, i) => i));
        geometry.setDrawRange(0, pass.length);
        // geometry.index = new THREE.Uint16BufferAttribute(Array(pass.length).fill(0).map((x, i) => i), 1);

        const mesh = new THREE.LineSegments(geometry, material);

        mesh.name = 'emitter';
        this.scene.add(mesh);
        this.passes.push({ mesh, instancedBuffer });
        verbose('emitter added.');
    }


    addPass(pass: Pass) {

        if (pass.geometry === EPartFxPassGeometry.k_Line) {
            this.addPassLine(pass);
            return;
        }

        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(pass);

        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(pass.data.buffer, pass.data.byteOffset), pass.stride);

        //
        // Instance data
        //

        pass.instanceLayout.forEach(desc => {
            const interleavedAttr = new THREE.InterleavedBufferAttribute(instancedBuffer, desc.size, desc.offset);
            geometry.addAttribute(desc.attrName, interleavedAttr);
        });

        //
        // Geometry
        //

        // FIXME: do not use hardcoded layout
        const geometryFixedLayout = {
            a_position0: instanceGeometry.attributes.position,
            a_normal0: instanceGeometry.attributes.normal,
            a_texcoord0: instanceGeometry.attributes.uv
        };

        geometry.index = instanceGeometry.index;
        for (const attrName in geometryFixedLayout) {
            geometry.attributes[attrName] = geometryFixedLayout[attrName];
        }

        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: pass.vertexShader,
            fragmentShader: pass.pixelShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false,
            // TODO: do not use for billboards
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = 'emitter';
        this.scene.add(mesh);
        this.passes.push({ mesh, instancedBuffer });
        verbose('emitter added.');
    }


    addPassDefaultMat(pass: Pass) {
        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(pass);
        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(pass.data.buffer, pass.data.byteOffset), pass.stride);

        //
        // Geometry
        //

        geometry.index = instanceGeometry.index;
        geometry.attributes.position = instanceGeometry.attributes.position;
        geometry.attributes.normal = instanceGeometry.attributes.normal;
        geometry.attributes.uv = instanceGeometry.attributes.uv;

        //
        // Instanced data
        //

        instancedBuffer.setDynamic(true);

        // todo: remove hardcoded layout or check it's validity.
        geometry.addAttribute('offset', new THREE.InterleavedBufferAttribute(instancedBuffer, 3, 0));
        geometry.addAttribute('color', new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 3));
        geometry.addAttribute('size', new THREE.InterleavedBufferAttribute(instancedBuffer, 1, 7));
        geometry.maxInstancedCount = pass.length;


        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: $vertexShader,
            fragmentShader: $fragmentShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = 'emitter';
        this.scene.add(mesh);
        this.passes.push({ mesh, instancedBuffer });
        verbose('emitter added.');
    }

    createInstinceGeometry(pass: Pass): THREE.BufferGeometry {
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
                break;
            case EPartFxPassGeometry.k_Billboard:
            default:
                instanceGeometry = new THREE.PlaneBufferGeometry();
        }
        return instanceGeometry;
    }

    // tslint:disable-next-line:max-func-body-length
    addEmitter(emitter: Emitter) {
        this.passes = [];

        if (!isDefAndNotNull(emitter)) {
            console.warn('no emitters found.');
            return;
        }

        // tslint:disable-next-line:max-func-body-length
        emitter.passes.forEach((pass, i) => {
            if (!pass.requiresDefaultMaterial()) {
               this.addPass(pass);
            } else {
                this.addPassDefaultMat(pass);
            }
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
        this.renderer.setSize(width, height - 3);
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
        const pipeline = this.state.pipeline;

        if (!pipeline) {
            return;
        }

        const emitter = pipeline.emitter;
        pipeline.update();

        for (let iPass = 0; iPass < this.passes.length; ++iPass) {
            const rendPass = this.passes[iPass];
            const emitPass = emitter.passes[iPass];

            if (emitPass.sorting) {
                emitPass.sort(this.camera.position);
            }

            const geometry = rendPass.mesh.geometry as THREE.BufferGeometry;

            rendPass.instancedBuffer.needsUpdate = true;
            if (emitPass.geometry === EPartFxPassGeometry.k_Line) {
                geometry.setDrawRange(0, emitPass.length);
            } else {
                (geometry as THREE.InstancedBufferGeometry).maxInstancedCount = emitPass.length;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(this.animate);

        this.setState({ nParticles: emitter.length });
    }

    shouldComponentUpdate(nextProps: ITreeSceneProps, nexState) {
        return this.state.pipeline !== nextProps.pipeline || this.state.nParticles !== nexState.nParticles;
    }

    // tslint:disable-next-line:member-ordering
    static getDerivedStateFromProps(props: ITreeSceneProps, state: IThreeSceneState) {
        if (state.pipeline === props.pipeline) {
            return null;
        }

        return { pipeline: props.pipeline };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.pipeline === this.state.pipeline) {
            const pipeline = this.props.pipeline;
            const emitter = pipeline.emitter;

            emitter.passes.forEach((pass, i) => {
                let { mesh } = this.passes[i];
                let material = mesh.material as THREE.RawShaderMaterial;
                // let geometry = mesh.geometry as THREE.InstancedBufferGeometry;

                if (pass.requiresDefaultMaterial()) {
                    return;
                }

                const { vertexShader, pixelShader: fragmentShader } = pass;

                if (material.vertexShader !== vertexShader ||
                    material.fragmentShader !== fragmentShader) {
                    verbose('material shadow reload.');

                    material.dispose();
                    material = new THREE.RawShaderMaterial({
                        uniforms: {},
                        vertexShader,
                        fragmentShader,
                        transparent: true,
                        blending: THREE.NormalBlending,
                        depthTest: false
                    });

                    // this.scene.remove(mesh);
                    mesh.material = material;

                    // mesh = new THREE.Mesh(geometry, material);
                }
            });
            return;
        }

        this.passes.forEach(pass => {
            this.scene.remove(pass.mesh);
            verbose('emitter removed.');
        });

        if (this.props.pipeline) {
            this.addEmitter(this.props.pipeline.emitter);
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
                    total={ this.state.pipeline.emitter.capacity }
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
