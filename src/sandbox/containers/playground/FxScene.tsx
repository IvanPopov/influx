/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */
/* tslint:disable:number-literal-format */
/* tslint:disable:no-string-literal */
/* tslint:disable:insecure-random */

import { assert, isDefAndNotNull, verbose } from '@lib/common';
import * as React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import ThreeScene, { IDeps, IThreeSceneState, ITreeSceneProps, resolveExternalDependencies, TEXTURE_PLACEHOLDER_WHITE_1X1 } from './ThreeScene';

import { IEmitter, IEmitterPass } from '@lib/idl/emitter';

import { asNativeRaw, typeAstToTypeLayout } from '@lib/fx/bytecode/VM/native';
import { createSLDocument } from '@lib/fx/SLDocument';
import * as Techniques from '@lib/fx/techniques';
import { createTextDocument } from '@lib/fx/TextDocument';
import UniformHelper, { IUniformHelper } from '@lib/fx/UniformHelper';
import { Color, IPlaygroundControl, IPlaygroundControlsState, Vector2, Vector3, Vector4 } from '@sandbox/store/IStoreState';
import * as GLSL from './shaders/fx';

import { ControlValueType } from '@lib/fx/bundles/utils';
import { ITexture, ITrimesh } from '@lib/idl/emitter/IEmitter';
import { IMap } from '@lib/idl/IMap';
import { Uniforms } from '@lib/idl/Uniforms';
import '@sandbox/styles/custom/dat-gui.css';
import { prepareTrimesh } from './utils/adjacency';
import { ITimeline } from '@lib/fx/timeline';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';

interface IFxSceneProps extends ITreeSceneProps {
    emitter: IEmitter;
}


interface IFxSceneState extends IThreeSceneState {
    emitter: IEmitter;  // completly loaded emitter
    loading: IEmitter;  // pointer to the currently loaded emitter
    nParticles: number; // aux. state for UI force reload
    time: string;
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

interface IPartLight {
    pos: [number, number, number];
    radius: number;
    color: [number, number, number];
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
    fontFamily: 'consolas, monospace',
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


function UnpackCanvasImageSource(img: CanvasImageSource): Uint8ClampedArray {
    const width = img.width as number;
    const height = img.height as number;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return canvas.getContext('2d').getImageData(0, 0, width, height).data;
}


function setUniformValue(helper: IUniformHelper, name: string, type: string, value: ControlValueType) {
    switch (type) {
        case 'int':
        case 'uint':
            helper.set(name).int(value as number);
            break;
        case 'float':
            helper.set(name).float(value as number);
            break;
        case 'float2':
            let v2 = value as Vector2;
            helper.set(name).float2(v2.x, v2.y);
            break;
        case 'float3':
            let v3 = value as Vector3;
            helper.set(name).float3(v3.x, v3.y, v3.z);
            break;
        case 'float4':
            let v4 = value as Vector4;
            helper.set(name).float4(v4.x, v4.y, v4.z, v4.w);
            break;
        case 'color':
            let color = value as Color;
            helper.set(name).float4(color.r, color.g, color.b, color.a);
            break;
    }
}

function prerecordUniforms(
    camera: THREE.PerspectiveCamera,
    timeline: ITimeline, 
    controls?: IPlaygroundControlsState,
    presetName?: string,
    ): Uniforms {

    const constants = timeline.getConstants();
    const helper = UniformHelper();
    helper.set('elapsedTime').float(constants.elapsedTime);
    helper.set('elapsedTimeLevel').float(constants.elapsedTimeLevel);
    helper.set('elapsedTimeThis').float(constants.elapsedTimeLevel);
    helper.set('parentPosition').float3(0, 0, 0);
    helper.set('cameraPosition').float3.apply(null, camera.position.toArray());
    helper.set('instanceTotal').int(2);
    helper.set('frameNumber').int(constants.frameNumber);

    if (controls) {
        if (presetName) {
            const preset = controls?.presets.find(p => p.name == presetName);
            preset?.data.forEach(entry => setUniformValue(helper, entry.name, entry.type, entry.value));
        }

        for (const name in controls.values) {
            const type = controls.controls[name].type;
            const value = controls.values[name];
            setUniformValue(helper, name, type, value);
        }
    }

    return helper.finish();
}

class TriangleGeometry extends THREE.BufferGeometry {
	constructor() {
		super();
		this.type = 'TriangleGeometry';

		const indices = [0, 1, 2];
		const vertices = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
		const normals = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
		const uvs = [ 0, 0, 0, 0, 0, 0 ];

		this.setIndex( indices );
		this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
	}
}


class FxScene extends ThreeScene<IFxSceneProps, IFxSceneState> {
    private passes: {
        meshes: (THREE.Mesh | THREE.LineSegments)[];
        instancedBuffer: THREE.InstancedInterleavedBuffer | THREE.InterleavedBuffer;
    }[];

    private env: {
        floor?: THREE.Mesh,
        leftWall?: THREE.Mesh,
        rightWall?: THREE.Mesh,
        backWall?: THREE.Mesh,
        ceiling?: THREE.Mesh
    } = null;
    
    private helperGeom?: THREE.Object3D[] = [];

    private textures: IMap<ITexture>;
    private meshes: IMap<ITrimesh>;

    constructor(props) {
        super(props);

        this.state = {
            emitter: null,
            loading: null,
            nParticles: 0,
            time: '0.00',
            ...this.stateInitials()
        };
    }


    componentDidMount() {
        super.componentDidMount();
        this.createUniformGroups(this.props.emitter);
        this.createSingleUniforms();
        this.createEmitter(this.props.emitter);
    }


    shouldComponentUpdate(nextProps: IFxSceneProps, nextState: IFxSceneState) {
        return this.state.emitter !== nextProps.emitter 
            || this.state.nParticles !== nextState.nParticles 
            || this.state.time !== nextState.time;
    }


    // this function is called because of ant state change
    // including part count
    componentDidUpdate(prevProps, prevState) {
        super.componentDidUpdate(prevProps, prevState);

        // loading still in process - nothing todo
        if (this.state.loading === this.props.emitter) {
            return;
        }

        // new emitter has been passed - reload required
        if (this.props.emitter !== this.state.emitter) {
            // reload emitter
            this.createEmitter(this.props.emitter);
            return;
        }

        // if emitter is just loaded or update
        const isLoaded = prevState.loading == this.state.emitter;
        const isUpdated = prevState.emitter === this.state.emitter;
        // ....
    }


    componentWillUnmount() {
        this.removeEmitter();
        super.componentWillUnmount();
    }


    render() {
        return (
            <div
                style={this.props.style}
                ref={(mount) => { this.mount = mount; }}
            >
                <Progress
                    value={this.state.nParticles}
                    total={this.props.emitter.getCapacity()}
                    attached='top'
                    size='medium'
                    indicating
                    style={progressStyleFix}
                />
                <div style={statsStyleFix}>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;count: <span>{this.state.nParticles}</span><br />
                    simulation: CPU<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fps: <span>{Math.round(this.state.fps.value)}</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;time: <span>{this.state.time}</span><br />
                </div>
            </div>
        );
    }





    private addPassLine(pass: IEmitterPass, passId: number) {
        const geometry = new THREE.BufferGeometry();
        const instanceData = Techniques.memoryToF32Array(pass.getData());
        const desc = pass.getDesc();
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(
            new Float32Array(instanceData.buffer, instanceData.byteOffset, instanceData.byteLength >> 2), 
            desc.stride
        );
        
        //
        // Instance data
        //

        desc.instanceLayout.forEach(attr => {
            const interleavedAttr = new THREE.InterleavedBufferAttribute(instancedBuffer, attr.size, attr.offset);
            geometry.setAttribute(attr.name, interleavedAttr);
        });

        const uniforms = this.uniforms;
        const material = new THREE.RawShaderMaterial({
            uniforms,
            vertexShader: desc.vertexShader,
            fragmentShader: desc.pixelShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false,
            // wireframeLinewidth: 5
        });

        
        (material as any).uniformsGroups = this.uniformGroups[passId];


        geometry.setDrawRange(0, pass.getNumRenderedParticles());

        const mesh = new THREE.LineSegments(geometry, material);
        this.scene.add(mesh);
        this.passes.push({ meshes: [mesh], instancedBuffer });
    }

    private addPass(pass: IEmitterPass, passId: number) {
        const desc = pass.getDesc();
        const instanceData = Techniques.memoryToF32Array(pass.getData());
        if (desc.geometry === "line") {
            this.addPassLine(pass, passId);
            return;
        }

        const { stride, instanceLayout, vertexShader, pixelShader, renderStates } = desc;

        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(
            new Float32Array(instanceData.buffer, instanceData.byteOffset, instanceData.byteLength >> 2), 
            stride
        );

        const attrs = instanceLayout.map(attr => {
            return {
                name: attr.name,
                data: new THREE.InterleavedBufferAttribute(instancedBuffer, attr.size, attr.offset)
            };
        });

        const uniforms = this.uniforms;
        const material = new THREE.RawShaderMaterial({
            uniforms,
            vertexShader: vertexShader,
            fragmentShader: pixelShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false,
            // TODO: do not use for billboards
            side: THREE.DoubleSide
        });


        // todo: add support to technique.cpp
        if (renderStates?.[ERenderStates.ZENABLE]) {
            material.depthTest = renderStates[ERenderStates.ZENABLE] === ERenderStateValues.TRUE;
        }

        // todo: add support to technique.cpp
        if (renderStates?.[ERenderStates.BLENDENABLE]) {
            material.transparent = renderStates[ERenderStates.BLENDENABLE] === ERenderStateValues.TRUE;
        }

        (material as any).uniformsGroups = this.uniformGroups[passId];

        const meshes = this.createInstinceGeometry(desc.geometry).map(instanceGeometry => {
            const geometry = new THREE.InstancedBufferGeometry();
            attrs.forEach(({ name, data }) => { geometry.setAttribute(name, data); });
            // FIXME: do not use hardcoded layout
            const geometryFixedLayout = {
                a_position0: instanceGeometry.attributes.position,
                a_normal0: instanceGeometry.attributes.normal,
                a_texcoord0: instanceGeometry.attributes.uv
            };
            if (instanceGeometry.index) {
                geometry.setIndex(instanceGeometry.index);
            } else {
                geometry.setIndex(Array(instanceGeometry.attributes.position.array.length / 3).fill(0).map((x, i) => i));
            }
            // geometry.index = instanceGeometry.index;
            for (const attrName in geometryFixedLayout) {
                geometry.attributes[attrName] = geometryFixedLayout[attrName];
            }
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `pass-${passId}-${desc.geometry}`;
            return mesh;
        });

        this.scene.add(...meshes);
        this.passes.push({ meshes, instancedBuffer });
    }


    private showEnv() {
        if (!this.env) this.addEnv();
        Object.keys(this.env).forEach(objName => (this.env[objName].visible = true));
    }


    private hideEnv() {
        if (!this.env) return;
        Object.keys(this.env).forEach(objName => (this.env[objName].visible = false));
    }


    private addEnv() {
        if (this.env) {
            return;
        }

        this.env = {};

        const scene = this.scene;
        this.env.floor = (_ => {
            const geo = new THREE.PlaneGeometry(20, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI * -.5;
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.leftWall = (_ => {
            const geo = new THREE.PlaneGeometry(20, 15);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = Math.PI * 0.5;
            mesh.position.set(-10, 7.5, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.rightWall = (_ => {
            const geo = new THREE.PlaneGeometry(20, 15);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.y = Math.PI * -0.5;
            mesh.position.set(10, 7.5, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.backWall = (_ => {
            const geo = new THREE.PlaneGeometry(15, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI * -0.5;
            mesh.position.set(0, 7.5, -10);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();

        this.env.ceiling = (_ => {
            const geo = new THREE.PlaneGeometry(20, 20);
            const mat = new THREE.MeshPhongMaterial({ shininess: 10, color: "#fff" });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI * 0.5;
            mesh.position.set(0, 15, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        })();
    }


    private addPassLight(passId: number) {
        this.showEnv();
        this.passes.push({ meshes: null, instancedBuffer: null });
    }


    private addPassLWI(pass: IEmitterPass, passId: number) {
        const desc = pass.getDesc();
        const instanceData = Techniques.memoryToF32Array(pass.getData());

        // desc.instanceName == "LwiInstance" || desc.instanceName == "LwiColoredInstance"
        const GLSLMat = {
            "LwiInstance": {
                vertexShader: Shaders('lwiMatVS'),
                fragmentShader: Shaders('lwiMatFS')
            },
            "LwiColoredInstance": {
                vertexShader: Shaders('lwiColoredMatVS'),
                fragmentShader: Shaders('lwiColoredMatFS')
            },
        }

        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(
            new Float32Array(instanceData.buffer, instanceData.byteOffset, instanceData.byteLength >> 2), 
            desc.stride
        );
        instancedBuffer.setUsage(THREE.DynamicDrawUsage);
        const a_dynData_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 0);
        const a_dynData_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 4);
        const a_worldMat_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 8);
        const a_worldMat_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 12);
        const a_worldMat_2 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 16);
        const a_worldMatPrev_0 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 20);
        const a_worldMatPrev_1 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 24);
        const a_worldMatPrev_2 = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 28);

        

        const uniforms = this.uniforms;
        const material = new THREE.RawShaderMaterial({
            uniforms,
            ...GLSLMat[desc.instanceName],
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: true,
            // TODO: do not use for billboards
            side: THREE.DoubleSide
        });

        (material as any).uniformsGroups = this.uniformGroups[passId];

        const meshes = this.createInstinceGeometry(desc.geometry, "box").map(instanceGeometry => {
            const geometry = new THREE.InstancedBufferGeometry();
            geometry.index = instanceGeometry.index;
            geometry.attributes.position = instanceGeometry.attributes.position;
            geometry.attributes.normal = instanceGeometry.attributes.normal;
            geometry.attributes.uv = instanceGeometry.attributes.uv;
            geometry.attributes.a_dynData_0 = a_dynData_0;
            geometry.attributes.a_dynData_1 = a_dynData_1;
            geometry.attributes.a_worldMat_0 = a_worldMat_0;
            geometry.attributes.a_worldMat_1 = a_worldMat_1;
            geometry.attributes.a_worldMat_2 = a_worldMat_2;
            geometry.attributes.a_worldMatPrev_0 = a_worldMatPrev_0;
            geometry.attributes.a_worldMatPrev_1 = a_worldMatPrev_1;
            geometry.attributes.a_worldMatPrev_2 = a_worldMatPrev_2;
            geometry.instanceCount = pass.getNumRenderedParticles();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `pass-lwi-${passId}-${desc.geometry}`;
            return mesh;
        });
        this.scene.add(...meshes);
        this.passes.push({ meshes: meshes, instancedBuffer });
    }


    private addPassDefaultMat(pass: IEmitterPass, passId: number) {
        const desc = pass.getDesc();
        const instanceData = Techniques.memoryToF32Array(pass.getData());
        // tslint:disable-next-line:max-line-length
        const instancedBuffer = new THREE.InstancedInterleavedBuffer(
            new Float32Array(instanceData.buffer, instanceData.byteOffset, instanceData.byteLength >> 2), 
            desc.stride
        );
        instancedBuffer.setUsage(THREE.DynamicDrawUsage);
        // instancedBuffer.setDynamic(true);
        // todo: remove hardcoded layout or check it's validity.
        const offset = new THREE.InterleavedBufferAttribute(instancedBuffer, 3, 0);
        const color = new THREE.InterleavedBufferAttribute(instancedBuffer, 4, 3);
        const size = new THREE.InterleavedBufferAttribute(instancedBuffer, 1, 7);

        const uniforms = this.uniforms;
        const material = new THREE.RawShaderMaterial({
            uniforms,
            vertexShader: Shaders('defMatVS'),
            fragmentShader: Shaders('defMatFS'),
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false
        });

        (material as any).uniformsGroups = this.uniformGroups[passId];

        const meshes = this.createInstinceGeometry(desc.geometry).map(instanceGeometry => {
            const geometry = new THREE.InstancedBufferGeometry();
            geometry.index = instanceGeometry.index;
            geometry.attributes.position = instanceGeometry.attributes.position;
            geometry.attributes.normal = instanceGeometry.attributes.normal;
            geometry.attributes.uv = instanceGeometry.attributes.uv;
            geometry.attributes.offset = offset;
            geometry.attributes.color = color;
            geometry.attributes.size = size;
            geometry.instanceCount = pass.getNumRenderedParticles();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `pass-def-${passId}-${desc.geometry}`;
            return mesh;
        });

        this.scene.add(...meshes);
        this.passes.push({ meshes, instancedBuffer });
    }


    private createInstinceGeometry(geometry: string, fallback = "billboard"): THREE.BufferGeometry[] {
        let instanceGeometry: THREE.BufferGeometry[] = null;
        switch (geometry) {
            case "box":
                instanceGeometry = [new THREE.BoxGeometry()];
                break;
            case "sphere":
                instanceGeometry = [new THREE.SphereGeometry(0.5)];
                break;
            case "cylinder":
                instanceGeometry = [new THREE.CylinderGeometry(0.5, 0.5, 1.0)];
                break;
            case "line":
                console.assert(false, "line should have been handled using different code branch");
                break;
            case "billboard":
                instanceGeometry = [new THREE.PlaneGeometry()];
                break;
            case "triangle":
                instanceGeometry = [ new TriangleGeometry() ];
                break;
            default:
                let objName = Object.keys(this.deps.models).find(name => name.includes(geometry));
                if (objName) {
                    let meshes = this.deps.models[objName];
                    if (meshes) {
                        return meshes.map(mesh => mesh.geometry);
                    }
                }
                return this.createInstinceGeometry(fallback);
        }
        return instanceGeometry;
    }


    private removeEmitter() {
        this.passes?.forEach(pass => {
            if (pass.meshes) {
                this.scene.remove(...pass.meshes);
            }
            // verbose('emitter\'s pass removed.');
        });

        Object.values(this.textures || {}).forEach(tex => {
            Techniques.destroyTexture(tex);
        });

        Object.values(this.meshes || {}).forEach(mesh => {
            Techniques.destroyTrimesh(mesh);
        });

        this.meshes = {};
        this.textures = {};
    }


    private createPasses(emitter: IEmitter) {
        this.passes = [];
        // tslint:disable-next-line:max-func-body-length
        let nPass = emitter.getPassCount();
        this.hideEnv();
        for (let i = 0; i < nPass; ++i) {
            let pass = emitter.getPass(i);
            let desc = pass.getDesc();
            if (desc.vertexShader && desc.pixelShader) {
                this.addPass(pass, i);
            } else if (desc.instanceName == "DefaultShaderInput") {
                this.addPassDefaultMat(pass, i);
            } else if (desc.instanceName == "LwiInstance" || desc.instanceName == "LwiColoredInstance") {
                this.addPassLWI(pass, i);
            } else if (desc.instanceName == "PartLight") {
                this.addPassLight(i);
            }
        }

        this.setState({ emitter, loading: null });
        verbose(`emitter '${emitter.getName()}' has been loaded.`);
    }


    private createEmitter(emitter: IEmitter) {
        this.removeEmitter();

        if (!isDefAndNotNull(emitter)) {
            return;
        }

        verbose(`emitter '${emitter.getName()}' loading in process...`);
        this.setState({ loading: emitter, emitter: null });

        const controls = this.props.controls;
        const doLoadTexture = true;//Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');

        resolveExternalDependencies(doLoadTexture, doLoadMeshes, this.deps, (deps: IDeps) => {
            this.createPasses(emitter);
        });
    }


    // setup resource for simulation
    // all except uniforms
    private setupResources() {
        const emitter = this.state.emitter;

        const createTextureFromSource = (dep: THREE.Texture) => {
            let img = dep.source.data;
            let width = img.width as number;
            let height = img.height as number;
            let data = null;

            // return Techniques.createTexture({ width: 1, height: 1 }, new Uint8Array([0,0,0,0]));
            if (img instanceof HTMLImageElement) {
                data = UnpackCanvasImageSource(img as CanvasImageSource);
            } else {
                data = img.data;
            }

            return Techniques.createTexture({ width, height }, data);
        };


        const createMeshFromSource = (dep: THREE.Mesh[]) => {
            const { geometry } = dep[0];
            assert(geometry);

            const { vertCount, faceCount, vertices, faces, indicesAdj, facesAdj } = prepareTrimesh(geometry);
            return Techniques.createTrimesh(
                {
                    vertCount,
                    faceCount
                },
                new Float32Array(vertices),
                new Uint32Array(faces),
                new Uint32Array(indicesAdj),
                new Uint32Array(facesAdj));
        };

        const controls = this.props.controls;
        for (const name in controls.values) {
            // todo: skip textrues and meshes
            const type = controls.controls[name].type;
            const value = controls.values[name] as string;

            if (type == 'texture2d') {
                // all the sources must be preloaded in advance (!)
                const source = this.deps.textures[value];

                // if (!source) {
                //     const value = 'TEXTURE_PLACEHOLDER_WHITE_1X1';
                //     if (!this.textures[value]) {
                //         this.textures[value] = createTextureFromSource(TEXTURE_PLACEHOLDER_WHITE_1X1);
                //     }
                //     emitter.setTexture(name, this.textures[value]);
                //     continue;
                // }

                if (!this.textures[value]) {
                    this.textures[value] = createTextureFromSource(source);
                }

                emitter.setTexture(name, this.textures[value]);
            }

            if (type == 'mesh') {
                // all the sources must be preloaded in advance (!)
                const source = this.deps.models[value];

                if (!this.meshes[value]) {
                    this.meshes[value] = createMeshFromSource(source);
                }

                // temp solution until geom is not rendered from effect
                if (this.meshDebugDraw[name]) {
                    this.helperGeom.push(...source.map(obj => {
                        const mesh = obj.clone();
                        // mesh.material = new THREE.MeshBasicMaterial({ 
                        //     color: 0xFF0000, 
                        //     wireframe: true, 
                        //     wireframeLinewidth: 3, 
                        //     transparent: true,
                        //     opacity: 0.25
                        // });

                        mesh.material = new THREE.MeshNormalMaterial();
                        // mesh.material = new THREE.MeshStandardMaterial({ map: this.deps.textures['skull.jpg'] });
                        return mesh;
                    }));

                //     {
                //         const color = 0xFFFFFF;
                //         const intensity = 0.2;
                //         const light = new THREE.AmbientLight(color, intensity);
                //         this.helperGeom.push(light);
                //     }

                //     {
                //         const color = 0xFFFFFF;
                //         const intensity = 0.8;
                //         const light = new THREE.PointLight(color, intensity, 10);
                //         light.position.set(3, 3, 3);
                //         this.helperGeom.push(light);
                //     }
                }

                emitter.setTrimesh(name, this.meshes[value]);
            }
        }
    }


    protected createLights(): THREE.Object3D[] {
        const emitter = this.state.emitter;
        const lights: THREE.Object3D[] = [];

        for (let iPass = 0; iPass < this.passes.length; ++iPass) {
            const rendPass = this.passes[iPass];
            const emitPass = emitter.getPass(iPass);
            const passDesc = emitPass.getDesc();

            if (!rendPass.meshes) {
                console.assert(emitPass.getDesc().instanceName == "PartLight");

                // is light pass
                const instanceData = Techniques.memoryToU8Array(emitPass.getData());

                for (let iPart = 0; iPart < emitPass.getNumRenderedParticles(); ++iPart) {
                    const pl = asNativeRaw(instanceData.subarray(PartLightT.size * iPart, (iPart + 1) * PartLightT.size), PartLightT) as IPartLight;
                    const ci = Math.max(...pl.color);
                    const c = Math.floor(pl.color[0] / ci * 255) | (Math.floor(pl.color[1] / ci * 255) << 8) | (Math.floor(pl.color[2] / ci * 255) << 16);
                    const light = new THREE.PointLight(c, 10, pl.radius, pl.attenuation == 0 ? 4 : pl.attenuation);
                    const helper = new THREE.PointLightHelper(light);
                    light.position.set(...pl.pos);
                    lights.push(light, helper);
                    // console.log(`${iPart}/${emitPass.getNumRenderedParticles()}`, partLight);
                }

                continue;
            }
        }

        return lights;
    }


    // update instance count for every pass geometry
    protected setGeometryInstanceCouts() {
        const emitter = this.state.emitter;
        for (let iPass = 0; iPass < this.passes.length; ++iPass) {
            const rendPass = this.passes[iPass];
            const emitPass = emitter.getPass(iPass);
            const passDesc = emitPass.getDesc();
            
            rendPass.instancedBuffer.needsUpdate = true;
            rendPass.meshes.forEach(mesh => {
                const geometry = mesh.geometry as THREE.BufferGeometry;
                if (passDesc.geometry === "line") {
                    geometry.setDrawRange(0, emitPass.getNumRenderedParticles());
                } else {
                    (geometry as THREE.InstancedBufferGeometry).instanceCount = emitPass.getNumRenderedParticles();
                }
            });
            // emitPass.dump();
        }
    }


    protected beginFrame() {
        const emitter = this.state.emitter;
        const timeline = this.props.timeline;
        const controls = this.props.controls;
        const camera = this.camera;
        const preset = this.preset;

        if (!emitter) {
            return;
        }

        // IP: including textures
        this.updateUniformsGroups(this.props.emitter);
        this.updateSingleUniforms();

        // dedicated way to setup bytecode bundle resource
        // todo: generalize with uniforms?
        this.setupResources();
        const uniforms = prerecordUniforms(camera, timeline, controls, preset);

        if (!timeline.isStopped() && !timeline.isPaused()) {
            timeline.tick();
            emitter.simulate(uniforms);
        }

        emitter.prerender(uniforms);
        // do nothing if there is no sorting
        emitter.serialize(); // feed render buffer with instance data

        this.setGeometryInstanceCouts();
        this.helperGeom.push(...this.createLights());
        if (this.helperGeom.length)
            this.scene.add(...this.helperGeom);

        this.setState({ 
            nParticles: emitter.getNumParticles(),
            time: timeline.getConstants().elapsedTimeLevel.toFixed(2)
         });

        // emitter.dump();
        // this.scene.add(new THREE.Mesh(geometry, new THREE.MeshNormalMaterial))
    }



    protected override endFrame(): void {
        this.scene.remove(...this.helperGeom);
        this.helperGeom = [];
    }

}

export default FxScene;
