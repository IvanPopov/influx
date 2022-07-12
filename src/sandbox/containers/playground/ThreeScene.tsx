/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { isDefAndNotNull, verbose } from '@lib/common';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import { OrbitControls } from '@three-ts/orbit-controls';

import { IEmitter, IEmitterPass, Uniforms } from '@lib/idl/emitter';
import { ITimeline } from '../../../lib/idl/emitter/timelime';

import * as Emitter from '@lib/fx/emitter';
import * as GLSL from './shaders';
import UniformHelper from '@lib/idl/emitter/UniformHelper';
import { createTextDocument } from '@lib/fx/TextDocument';
import { createSLDocument } from '@lib/fx/SLDocument';
import { asNative, asNativeRaw, typeAstToTypeLayout } from '@lib/fx/bytecode/VM/native';

let desc = `
struct PartLight {
    float3 pos;
    float radius;
    float3 color;
    float attenuation;
    float viewZ;
    int camIdx;
    bool isFpView;
    bool isAdaptiveIntensity;
 };
`;

interface IPartLight
{
    pos: [ number, number, number ];
    radius: number;
    color: [ number, number, number ];
    attenuation: number;
}

const textDocument = createTextDocument('://raw', desc);
const slDocument = await createSLDocument(textDocument);
const PartLightT = typeAstToTypeLayout(slDocument.root.scope.findType('PartLight'));


const Shaders = (id: string) => GLSL[id];

interface ITreeSceneProps {
    style: React.CSSProperties;
    emitter: IEmitter;
    timeline: ITimeline;
}

interface IThreeSceneState {
    emitter: IEmitter;
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
        mesh: THREE.Mesh | THREE.LineSegments;
        instancedBuffer: THREE.InstancedInterleavedBuffer | THREE.InterleavedBuffer;
    }[];

    env: {
        floor?: THREE.Mesh,
        leftWall?: THREE.Mesh,
        rightWall?: THREE.Mesh,
        backWall?: THREE.Mesh,
        ceiling?: THREE.Mesh
    } = null;

    lights: THREE.PointLight[] = [];

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
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
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

    addPassLine(pass: IEmitterPass) {
        const geometry = new THREE.BufferGeometry();
        const instanceData = Emitter.memoryToF32Array(pass.getData());
        const desc = pass.getDesc();
        const instancedBuffer = new THREE.InterleavedBuffer(new Float32Array(instanceData.buffer, instanceData.byteOffset), desc.stride);
        //
        // Instance data
        //

        desc.instanceLayout.forEach(attr => {
            const interleavedAttr = new THREE.InterleavedBufferAttribute(instancedBuffer, attr.size, attr.offset);
            geometry.setAttribute(attr.name, interleavedAttr);
        });


        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: desc.vertexShader,
            fragmentShader: desc.pixelShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false,
            // wireframeLinewidth: 5
        });

        geometry.setDrawRange(0, pass.getNumRenderedParticles());

        const mesh = new THREE.LineSegments(geometry, material);

        mesh.name = 'emitter';
        this.scene.add(mesh);
        this.passes.push({ mesh, instancedBuffer });
        // verbose('emitter added.');
    }


    addPass(pass: IEmitterPass) {
        const desc = pass.getDesc();
        const instanceData = Emitter.memoryToF32Array(pass.getData());
        if (desc.geometry === "line") {
            this.addPassLine(pass);
            return;
        }

        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(desc.geometry);

        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(instanceData.buffer, instanceData.byteOffset), desc.stride);

        //
        // Instance data
        //

        desc.instanceLayout.forEach(attr => {
            const interleavedAttr = new THREE.InterleavedBufferAttribute(instancedBuffer, attr.size, attr.offset);
            geometry.setAttribute(attr.name, interleavedAttr);
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
            vertexShader: desc.vertexShader,
            fragmentShader: desc.pixelShader,
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
        // verbose('emitter added.');
    }

    showEnv() {
        if (!this.env) this.addEnv();
        Object.keys(this.env).forEach(objName => (this.env[objName].visible = true));
    }

    hideEnv() {
        if (!this.env) return;
        Object.keys(this.env).forEach(objName => (this.env[objName].visible = false));
    }

    addEnv() {
        if (this.env) {
            return;
        }

        this.env = {};
        // const light = new THREE.PointLight( 0x00ff00, 1, 5 );
        // const helper = new THREE.PointLightHelper(light);
        // light.position.set( 0, 2, 0 );

        // let showLight = true;
        // setTimeout(() => {
        //     if (showLight)
        //     {
        //         this.scene.add( light, helper );
        //     }
        //     else {
        //         this.scene.remove( light, helper );
        //     }

        //     showLight = !showLight;
        // }, 1000);

        const scene = this.scene;
        this.env.floor = (_ => {
            const geo = new THREE.PlaneBufferGeometry(20, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI * -.5;
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.leftWall = (_ => {
            const geo = new THREE.PlaneBufferGeometry(20, 15);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = Math.PI * 0.5;
            mesh.position.set(-10, 7.5, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.rightWall = (_ => {
            const geo = new THREE.PlaneBufferGeometry(20, 15);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = Math.PI * -0.5;
            mesh.position.set(10, 7.5, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.backWall = (_ => {
            const geo = new THREE.PlaneBufferGeometry(15, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI * -0.5;
            mesh.position.set(0, 7.5, -10);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.ceiling = (_ => {
            const geo = new THREE.PlaneBufferGeometry(20, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI * 0.5;
            mesh.position.set(0, 15, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();
    }

    addPassLight() {
        this.showEnv();
        const mesh = null;
        const instancedBuffer = null;
        this.passes.push({ mesh, instancedBuffer });
    }

    addPassLWI(pass: IEmitterPass) {
        const desc = pass.getDesc();
        const instanceData = Emitter.memoryToF32Array(pass.getData());
        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(desc.geometry, "sphere");

        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(instanceData.buffer, instanceData.byteOffset), desc.stride);

        //
        // Geometry
        //

        geometry.index = instanceGeometry.index;
        geometry.attributes.position = instanceGeometry.attributes.position;
        geometry.attributes.normal = instanceGeometry.attributes.normal;
        geometry.attributes.uv = instanceGeometry.attributes.uv;
        geometry.attributes.a_dynData_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 0);
        geometry.attributes.a_dynData_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 4);
        geometry.attributes.a_worldMat_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 8);
        geometry.attributes.a_worldMat_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 12);
        geometry.attributes.a_worldMat_2 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 16);
        geometry.attributes.a_worldMatPrev_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 20);
        geometry.attributes.a_worldMatPrev_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 24);
        geometry.attributes.a_worldMatPrev_2 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 28);


        // instancedBuffer.setDynamic(true);
        instancedBuffer.setUsage(THREE.DynamicDrawUsage);

        geometry.instanceCount = pass.getNumRenderedParticles();

        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: Shaders('lwiMatVS'),
            fragmentShader: Shaders('lwiMatFS'),
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: true,
            // TODO: do not use for billboards
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = 'emitter';
        this.scene.add(mesh);
        this.passes.push({ mesh, instancedBuffer });
        // verbose('emitter added.');
    }

    addPassDefaultMat(pass: IEmitterPass) {
        const desc = pass.getDesc();
        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(desc.geometry);
        const instanceData = Emitter.memoryToF32Array(pass.getData());
        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(new Float32Array(instanceData.buffer, instanceData.byteOffset), desc.stride);

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

        // instancedBuffer.setDynamic(true);
        instancedBuffer.setUsage(THREE.DynamicDrawUsage);

        // todo: remove hardcoded layout or check it's validity.
        geometry.attributes.offset = new THREE.InterleavedBufferAttribute(instancedBuffer, 3, 0);
        geometry.attributes.color = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 3);
        geometry.attributes.size = new THREE.InterleavedBufferAttribute(instancedBuffer, 1, 7);

        // geometry.maxInstancedCount = pass.length();
        geometry.instanceCount = pass.getNumRenderedParticles();


        const material = new THREE.RawShaderMaterial({
            uniforms: {},
            vertexShader: Shaders('defMatVS'),
            fragmentShader: Shaders('defMatFS'),
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

    createInstinceGeometry(geometry: string, fallback = "billboard"): THREE.BufferGeometry {
        let instanceGeometry: THREE.BufferGeometry = null;
        switch (geometry) {
            case "box":
                instanceGeometry = new THREE.BoxBufferGeometry();
                break;
            case "sphere":
                instanceGeometry = new THREE.SphereBufferGeometry(0.5);
                break;
            case "cylinder":
                instanceGeometry = new THREE.CylinderBufferGeometry(0.5, 0.5, 1.0);
                break;
            case "line":
                console.assert(false, "line should have been handled using different code branch");
                break;
            case "billboard":
                instanceGeometry = new THREE.PlaneBufferGeometry();
                break;
            default:
                return this.createInstinceGeometry(fallback);
        }
        return instanceGeometry;
    }

    // tslint:disable-next-line:max-func-body-length
    addEmitter(emitter: IEmitter) {
        this.passes = [];

        if (!isDefAndNotNull(emitter)) {
            console.warn('no emitters found.');
            return;
        }

        // tslint:disable-next-line:max-func-body-length
        let nPass = emitter.getPassCount();
        this.hideEnv();
        for (let i = 0; i < nPass; ++i) {
            let pass = emitter.getPass(i);
            let desc = pass.getDesc();
            if (desc.vertexShader && desc.pixelShader) {
                this.addPass(pass);
            } else if (desc.instanceName == "DefaultShaderInput") {
                this.addPassDefaultMat(pass);
            } else if (desc.instanceName == "LwiInstance") {
                this.addPassLWI(pass);
            } else if (desc.instanceName == "PartLight") {
                this.addPassLight();
            }
        }
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
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true /* to be able to save screenshots */ });
        // this.renderer.setClearColor('#000000');
        this.renderer.setSize(width, height - 3);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.mount.appendChild(this.renderer.domElement);

        this.renderer.domElement.id = "playground-main-canvas";
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

        document.removeEventListener("visibilitychange", this.handleVisibilityChange, false);
    }


    start = () => {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate);
        }
    }


    stop = () => {
        cancelAnimationFrame(this.frameId);
    }

    animate = async (time: number) => {
        const emitter = this.state.emitter;
        const timeline = this.props.timeline;

        if (!emitter) {
            return;
        }

        let constants = timeline.getConstants();
        let helper = UniformHelper();
        helper.set('elapsedTime').float(constants.elapsedTime);
        helper.set('elapsedTimeLevel').float(constants.elapsedTimeLevel);
        helper.set('parentPosition').float3(0, 0, 0);
        helper.set('cameraPosition').float3.apply(null, this.camera.position.toArray());
        helper.set('instanceTotal').int(2);
        let uniforms = helper.finish();

        if (!timeline.isStopped()) {
            timeline.tick();
            emitter.simulate(uniforms);
        }

        emitter.prerender(uniforms);
        emitter.serialize(); // feed render buffer with instance data

        const lights = [];

        for (let iPass = 0; iPass < this.passes.length; ++iPass) {
            const rendPass = this.passes[iPass];
            const emitPass = emitter.getPass(iPass);
            const passDesc = emitPass.getDesc();

            if (!rendPass.mesh) {
                console.assert(emitPass.getDesc().instanceName == "PartLight");

                // is light pass
                const instanceData = Emitter.memoryToU8Array(emitPass.getData());
                
                for (let iPart = 0; iPart < emitPass.getNumRenderedParticles(); ++iPart)
                {
                    const pl = asNativeRaw(instanceData.subarray(PartLightT.size * iPart, (iPart + 1) * PartLightT.size), PartLightT) as IPartLight;
                    const ci = Math.max(...pl.color);
                    const c = Math.floor(pl.color[0] / ci * 255) | (Math.floor(pl.color[1] / ci * 255) << 8) | (Math.floor(pl.color[2] / ci * 255) << 16);
                    const light = new THREE.PointLight( c, 10, pl.radius, pl.attenuation == 0 ? 4 : pl.attenuation );
                    const helper = new THREE.PointLightHelper(light);
                    light.position.set( ...pl.pos );
                    lights.push(light, helper);
                    // console.log(`${iPart}/${emitPass.getNumRenderedParticles()}`, partLight);
                }

                continue;
            }

            const geometry = rendPass.mesh.geometry as THREE.BufferGeometry;

            rendPass.instancedBuffer.needsUpdate = true;
            if (passDesc.geometry === "line") {
                geometry.setDrawRange(0, emitPass.getNumRenderedParticles());
            } else {
                (geometry as THREE.InstancedBufferGeometry).instanceCount = emitPass.getNumRenderedParticles();
            }
            // emitPass.dump();
        }
        if (lights.length) this.scene.add(...lights);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(this.animate);
        if (lights.length) this.scene.remove(...lights);
        this.setState({ nParticles: emitter.getNumParticles() });
        // emitter.dump();
    }

    shouldComponentUpdate(nextProps: ITreeSceneProps, nexState) {
        return this.state.emitter !== nextProps.emitter || this.state.nParticles !== nexState.nParticles;
    }

    // tslint:disable-next-line:member-ordering
    static getDerivedStateFromProps(props: ITreeSceneProps, state: IThreeSceneState) {
        if (state.emitter === props.emitter) {
            return null;
        }

        return { emitter: props.emitter };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.emitter === this.state.emitter) {
            const emitter = this.props.emitter;

            let nPass = emitter.getPassCount();
            for (let i = 0; i < nPass; ++i) {
                let pass = emitter.getPass(i);
                let desc = pass.getDesc();
                let { mesh } = this.passes[i];

                if (!mesh) {
                    continue;
                }

                let material = mesh.material as THREE.RawShaderMaterial;
                // let geometry = mesh.geometry as THREE.InstancedBufferGeometry;

                if (!desc.vertexShader || !desc.pixelShader) {
                    return;
                }

                const { vertexShader, pixelShader: fragmentShader } = desc;

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
            };
            return;
        }

        this.passes.forEach(pass => {
            this.scene.remove(pass.mesh);
            // verbose('emitter removed.');
        });

        if (this.props.emitter) {
            this.addEmitter(this.props.emitter);
        }
    }


    render() {
        // console.log('ThreeScene::render()');
        return (
            <div
                style={this.props.style}
                ref={(mount) => { this.mount = mount; }}
            >
                <Progress
                    value={this.state.nParticles}
                    total={this.state.emitter.getCapacity()}
                    attached='top'
                    size='medium'
                    indicating
                    style={progressStyleFix}
                />
                <div style={statsStyleFix}>
                    <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;count: {this.state.nParticles}</span>
                    <br />
                    <span>simulation: CPU</span>
                </div>
            </div>
        );
    }
}

export default ThreeScene;
