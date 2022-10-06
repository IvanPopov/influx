/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { isDefAndNotNull, verbose } from '@lib/common';
import * as React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';

import { IEmitter, IEmitterPass } from '@lib/idl/emitter';

import { asNativeRaw, typeAstToTypeLayout } from '@lib/fx/bytecode/VM/native';
import * as Techniques from '@lib/fx/techniques';
import { createSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import UniformHelper from '@lib/fx/UniformHelper';
import { Color, Vector3 } from '@sandbox/store/IStoreState';
import * as GLSL from './shaders/fx';

import '@sandbox/styles/custom/dat-gui.css';

interface IFxSceneProps extends ITreeSceneProps {
    emitter: IEmitter;
}


interface IFxSceneState extends IThreeSceneState {
    emitter: IEmitter;
    nParticles: number;
}

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

const textDocument = await createTextDocument('://raw', desc);
const slDocument = await createSLDocument(textDocument);
const PartLightT = typeAstToTypeLayout(slDocument.root.scope.findType('PartLight'));
const Shaders = (id: string) => GLSL[id];
const statsStyleFix: React.CSSProperties = {
    position: 'absolute',
    color: 'white',
    padding: '2px 5px',
    fontFamily: 'consolas',
    fontSize: '10px',
    right: '0',
    lineHeight: '11px',
    textShadow: '0 0 1px grey',
    whiteSpace: 'pre'
};

const progressStyleFix: React.CSSProperties = {
    background: '#eee',
    borderRadius: '0'
};


class FxScene extends ThreeScene<IFxSceneProps, IFxSceneState> {
    state: IFxSceneState;

    
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


    constructor(props) {
        super(props);

        this.state = {
            emitter: null,
            nParticles: 0,
            ...this.stateInitials()
        };
    }


    componentDidMount() {
        super.componentDidMount();
        this.addEmitter(this.props.emitter);
    }

    
    addPassLine(pass: IEmitterPass) {
        const geometry = new THREE.BufferGeometry();
        const instanceData = Techniques.memoryToF32Array(pass.getData());
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
        const instanceData = Techniques.memoryToF32Array(pass.getData());
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
        const instanceData = Techniques.memoryToF32Array(pass.getData());
        const geometry = new THREE.InstancedBufferGeometry();
        const instanceGeometry: THREE.BufferGeometry = this.createInstinceGeometry(desc.geometry, "box");

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
        const instanceData = Techniques.memoryToF32Array(pass.getData());
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



    feedScene (time: DOMHighResTimeStamp) {
        const emitter = this.state.emitter;
        const timeline = this.props.timeline;
        const controls = this.props.controls;

        if (!emitter) {
            return;
        }

        let constants = timeline.getConstants();
        let helper = UniformHelper();
        helper.set('elapsedTime').float(constants.elapsedTime);
        helper.set('elapsedTimeLevel').float(constants.elapsedTimeLevel);
        helper.set('elapsedTimeThis').float(constants.elapsedTimeLevel);
        helper.set('parentPosition').float3(0, 0, 0);
        helper.set('cameraPosition').float3.apply(null, this.camera.position.toArray());
        helper.set('instanceTotal').int(2);

        if (this.preset) {
            let preset = this.props.controls.presets.find(p => p.name == this.preset);
            preset.data.forEach(entry => helper.set(entry.name).raw(entry.value));
        }

        for (let name in controls.values) {
            switch (controls.props[name].type) {
                case "UIFloatSpinner":
                case "UIFloat": helper.set(name).float(controls.values[name] as number); break;
                case "UISpinner":
                case "UIInt":
                case "UIUint":
                    helper.set(name).int(controls.values[name] as number); break;
                // todo: add alpha support!
                case "UIFloat3":
                    let { x, y, z } = controls.values[name] as Vector3;
                    helper.set(name).float3(x, y, z); 
                    break;
                case "UIColor":
                    let { r, g, b, a } = controls.values[name] as Color;
                    helper.set(name).float4(r, g, b, a);
                    break;
            }
        }

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
                const instanceData = Techniques.memoryToU8Array(emitPass.getData());
                
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
        if (lights.length) this.scene.remove(...lights);
        this.setState({ nParticles: emitter.getNumParticles() });

        // emitter.dump();
    }


    shouldComponentUpdate(nextProps: IFxSceneProps, nexState) {
        return this.state.emitter !== nextProps.emitter || this.state.nParticles !== nexState.nParticles;
    }


    // tslint:disable-next-line:member-ordering
    static getDerivedStateFromProps(props: IFxSceneProps, state: IFxSceneState) {
        if (state.emitter === props.emitter) {
            return null;
        }

        return { emitter: props.emitter };
    }


    componentDidUpdate(prevProps, prevState) {
        super.componentDidUpdate(prevProps, prevState);

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
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;count: <span>{this.state.nParticles}</span><br/>
                    simulation: CPU<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FPS: <span>{Math.round(this.state.fps.value)}</span><br/>
                </div>
            </div>
        );
    }
}

export default FxScene;
