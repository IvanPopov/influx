import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GUI } from 'dat.gui';

import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import * as THREE from 'three';
import autobind from 'autobind-decorator';
import { IConstantBuffer, ITechnique } from '@lib/idl/ITechnique';
import { isNumber, isString } from '@lib/common';
import { IUniform } from 'three';
import { IMap } from '@lib/idl/IMap';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { UIProperties } from '@lib/idl/bundles/FxBundle_generated';
import { Color, ControlValue, Vector3 } from '@sandbox/store/IStoreState';
import { assert } from 'console';

const UNUSED32 = -1 >>> 0;


class vertexHashEntry {
    v: THREE.Vector3;
    index: number;
    next: vertexHashEntry;
};


function GeneratePointReps(
    indices: number[], nFaces: number,
    positions: ArrayLike<number>, nVerts: number) {
    const pointRep: number[] = new Array(nVerts);
    const vertexToCorner = new Array<number>(nVerts);
    const vertexCornerList = (new Array<number>(nFaces * 3));

    vertexToCorner.fill(UNUSED32);
    vertexCornerList.fill(UNUSED32);

    // build initial lists and validate indices
    for (let j = 0; j < (nFaces * 3); ++j) {
        let k = indices[j];
        if (k === -1)
            continue;

        if (k >= nVerts) {
            assert(false);
            return null;
        }

        vertexCornerList[j] = vertexToCorner[k];
        vertexToCorner[k] = j;
    }


    const hashTable: IMap<vertexHashEntry> = {};
    const pos = vert => new THREE.Vector3(positions[vert * 3 + 0], positions[vert * 3 + 1], positions[vert * 3 + 2]);

    for (let vert = 0; vert < nVerts; ++vert) {
        let px = pos(vert).x;
        let py = pos(vert).y;
        let pz = pos(vert).z;

        const hashKey = `${px.toFixed(3)}:${py.toFixed(3)}:${pz.toFixed(3)}`;


        let found = UNUSED32;

        for (let current = hashTable[hashKey]; current != null; current = current.next) {
            if (current.v.x == pos(vert).x
                && current.v.y == pos(vert).y
                && current.v.z == pos(vert).z) {
                let head = vertexToCorner[vert];

                let ispresent = false;

                while (head != UNUSED32) {
                    const face = head / 3;
                    if ((indices[face * 3] == current.index) || (indices[face * 3 + 1] == current.index) || (indices[face * 3 + 2] == current.index)) {
                        ispresent = true;
                        break;
                    }

                    head = vertexCornerList[head];
                }

                if (!ispresent) {
                    found = current.index;
                    break;
                }
            }
        }

        if (found != UNUSED32) {
            pointRep[vert] = found;
        }
        else {
            let newEntry = new vertexHashEntry;

            newEntry.v = pos(vert);
            newEntry.index = vert;
            newEntry.next = hashTable[hashKey];
            hashTable[hashKey] = newEntry;

            pointRep[vert] = vert;
        }
    }

    return pointRep;
}


class edgeHashEntry {
    v1: number;
    v2: number;
    vOther: number;
    face: number;
    next: edgeHashEntry;
};

//---------------------------------------------------------------------------------
// Convert PointRep to Adjacency
//---------------------------------------------------------------------------------

function ConvertPointRepsToAdjacencyImpl(
    indices: ArrayLike<number>, nFaces: number,
    positions: ArrayLike<number>, nVerts: number,
    pointRep: ArrayLike<number>) {
    const adjacency: number[] = new Array(nFaces * 3);
    const hashTable: IMap<edgeHashEntry> = {};

    const pos = vert => new THREE.Vector3(positions[vert * 3 + 0], positions[vert * 3 + 1], positions[vert * 3 + 2]);

    // add face edges to hash table and validate indices
    for (let face = 0; face < nFaces; ++face) {
        let i0 = indices[face * 3];
        let i1 = indices[face * 3 + 1];
        let i2 = indices[face * 3 + 2];

        if (i0 == -1
            || i1 == -1
            || i2 == -1)
            continue;

        if (i0 >= nVerts
            || i1 >= nVerts
            || i2 >= nVerts)
            return null;

        const v1 = pointRep[i0];
        const v2 = pointRep[i1];
        const v3 = pointRep[i2];

        // filter out degenerate triangles
        if (v1 == v2 || v1 == v3 || v2 == v3)
            continue;

        for (let point = 0; point < 3; ++point) {
            const va = pointRep[indices[face * 3 + point]];
            const vb = pointRep[indices[face * 3 + ((point + 1) % 3)]];
            const vOther = pointRep[indices[face * 3 + ((point + 2) % 3)]];

            const hashKey = `${va}`;

            let newEntry = new edgeHashEntry;
            newEntry.v1 = va;
            newEntry.v2 = vb;
            newEntry.vOther = vOther;
            newEntry.face = face;
            newEntry.next = hashTable[hashKey];
            hashTable[hashKey] = newEntry;
        }
    }

    adjacency.fill(UNUSED32)

    for (let face = 0; face < nFaces; ++face) {
        let i0 = indices[face * 3];
        let i1 = indices[face * 3 + 1];
        let i2 = indices[face * 3 + 2];

        // filter out unused triangles
        if (i0 == -1
            || i1 == -1
            || i2 == -1)
            continue;

        const v1 = pointRep[i0];
        const v2 = pointRep[i1];
        const v3 = pointRep[i2];

        // filter out degenerate triangles
        if (v1 == v2 || v1 == v3 || v2 == v3)
            continue;

        for (let point = 0; point < 3; ++point) {
            if (adjacency[face * 3 + point] != UNUSED32)
                continue;

            // see if edge already entered, if not then enter it
            const va = pointRep[indices[face * 3 + ((point + 1) % 3)]];
            const vb = pointRep[indices[face * 3 + point]];
            const vOther = pointRep[indices[face * 3 + ((point + 2) % 3)]];

            const hashKey = `${va}`;

            let current = hashTable[hashKey];
            let prev = null;

            let foundFace = UNUSED32;

            while (current != null) {
                if ((current.v2 == vb) && (current.v1 == va)) {
                    foundFace = current.face;
                    break;
                }

                prev = current;
                current = current.next;
            }

            let found = current;
            let foundPrev = prev;

            let bestDiff = -2.0;

            // Scan for additional matches
            if (current) {
                prev = current;
                current = current.next;

                // find 'better' match
                while (current != null) {
                    if ((current.v2 == vb) && (current.v1 == va)) {
                        const pB1 = pos(vb);
                        const pB2 = pos(va);
                        const pB3 = pos(vOther);

                        let v12 = (new THREE.Vector3).subVectors(pB1, pB2);
                        let v13 = (new THREE.Vector3).subVectors(pB1, pB3);

                        const bnormal = v12.cross(v13).normalize();

                        if (bestDiff == -2.0) {
                            const pA1 = pos(found.v1);
                            const pA2 = pos(found.v2);
                            const pA3 = pos(found.vOther);

                            v12 = (new THREE.Vector3).subVectors(pA1, pA2);
                            v13 = (new THREE.Vector3).subVectors(pA1, pA3);

                            const anormal = (new THREE.Vector3).crossVectors(v12, v13).normalize();

                            bestDiff = anormal.dot(bnormal);
                        }

                        const pA1 = pos(current.v1);
                        const pA2 = pos(current.v2);
                        const pA3 = pos(current.vOther);

                        v12 = (new THREE.Vector3).subVectors(pA1, pA2);
                        v13 = (new THREE.Vector3).subVectors(pA1, pA3);

                        const anormal = (new THREE.Vector3).crossVectors(v12, v13).normalize();

                        const diff = anormal.dot(bnormal);

                        // if face normals are closer, use new match
                        if (diff > bestDiff) {
                            found = current;
                            foundPrev = prev;
                            foundFace = current.face;
                            bestDiff = diff;
                        }
                    }

                    prev = current;
                    current = current.next;
                }
            }

            if (foundFace != UNUSED32) {
                assert(found != null);

                // remove found face from hash table
                if (foundPrev != null) {
                    foundPrev.next = found.next;
                }
                else {
                    hashTable[hashKey] = found.next;
                }

                assert(adjacency[face * 3 + point] == UNUSED32);
                adjacency[face * 3 + point] = foundFace;

                // Check for other edge
                const hashKey2 = `${vb}`;

                current = hashTable[hashKey2];
                prev = null;

                while (current != null) {
                    if ((current.face == face) && (current.v2 == va) && (current.v1 == vb)) {
                        // trim edge from hash table
                        if (prev != null) {
                            prev.next = current.next;
                        }
                        else {
                            hashTable[hashKey2] = current.next;
                        }
                        break;
                    }

                    prev = current;
                    current = current.next;
                }

                // mark neighbor to point back
                let linked = false;

                for (let point2 = 0; point2 < point; ++point2) {
                    if (foundFace == adjacency[face * 3 + point2]) {
                        linked = true;
                        adjacency[face * 3 + point] = UNUSED32;
                        break;
                    }
                }

                if (!linked) {
                    let point2 = 0;
                    for (; point2 < 3; ++point2) {
                        let k = indices[foundFace * 3 + point2];
                        if (k == -1)
                            continue;

                        if (pointRep[k] == va)
                            break;
                    }

                    if (point2 < 3) {
                        // update neighbor to point back to this face match edge
                        adjacency[foundFace * 3 + point2] = face;
                    }
                }
            }
        }
    }

    return adjacency;
}



function controlToThreeValue(ctrl: ControlValue, propType: string): THREE.Vector4 | THREE.Vector3 | Number {
    const type = propType as keyof typeof UIProperties;
    switch (type) {
        case 'UIColor':
            {
                const { r, g, b, a } = ctrl as Color;
                return new THREE.Vector4(r, g, b, a);
            }
        case 'UIFloat3':
            {
                const { x, y, z } = ctrl as Vector3;
                return new THREE.Vector3(x, y, z);
            }
        case 'UIFloat':
        case 'UIFloatSpinner':
        case 'UIInt':
        case 'UIInt':
        case 'UISpinner': break;
        default:
            console.error('unsupported type found');
    }

    return ctrl as Number;
}

interface IMaterialSceneProps extends ITreeSceneProps {
    material: ITechnique;
}


interface IMaterialSceneState extends IThreeSceneState {
    // todo
}


class MaterialScene extends ThreeScene<IMaterialSceneProps, IMaterialSceneState> {
    state: IMaterialSceneState;

    composer: EffectComposer;
    groups: THREE.Group[];

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    protected createRenderer(width, height): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            /* to be able to save screenshots */
            preserveDrawingBuffer: true
        });
        renderer.toneMapping = THREE.ReinhardToneMapping;
        return renderer;
    }

    params = {
        // tonemap
        bloom: false,
        toneMappingExposure: 1.0,
        bloomStrength: 0.3,
        bloomThreshold: 0.0,
        bloomRadius: 1.0,

        // general
        model: 'probe'
    };

    uniforms: IMap<IUniform<THREE.Vector4 | THREE.Vector3 | Number>> = {
        elapsedTime: { value: 0 },
        elapsedTimeLevel: { value: 0 },
        // elapsedTimeThis: { value: 0 }
    }

    createSceneControls(bloomPass: UnrealBloomPass, renderer: THREE.WebGLRenderer) {
        const params = this.params;
        const gui = new GUI({ autoPlace: false });

        // gui.name = 'Tonemapping';
        GUI.TEXT_OPEN = 'Show Options';

        this.mount.appendChild(gui.domElement);
        gui.domElement.style.position = 'absolute';
        gui.domElement.style.bottom = '23px';

        let tonemap = gui.addFolder('tonemapping');

        tonemap.add(params, 'bloom').onChange(value => {
            this.saveSceneParams();
        });

        tonemap.add(params, 'toneMappingExposure', 0.1, 2.0).onChange((value) => {
            renderer.toneMappingExposure = Math.pow(value, 4.0);
            this.saveSceneParams();
        }).name('exposure');

        tonemap.add(params, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
            bloomPass.threshold = Number(value);
            this.saveSceneParams();
        });

        tonemap.add(params, 'bloomStrength', 0.0, 3.0).onChange((value) => {
            bloomPass.strength = Number(value);
            this.saveSceneParams();
        });

        tonemap.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange((value) => {
            bloomPass.radius = Number(value);
            this.saveSceneParams();
        });

        tonemap.open();

        gui.add(params, 'model', [ 'probe', 'cube' ]).onChange((value) => {
            this.reloadModel();
        });

        gui.close();
    }

    reloadModel() {
        const loader = new OBJLoader();
        const params = this.params;
        const passCount = this.props.material.getPassCount();
        const scene = this.scene;

        this.scene.remove(...(this.groups || []));

        loader.load(
            `./assets/models/${params.model}.obj`,
            (group: THREE.Group) => {

                this.groups = Array(passCount).fill(null).map(x => group.clone(true));
                this.groups.forEach(g => {
                    g.children.forEach(c => {
                        const m = c as THREE.Mesh;
                        const g = m.geometry;
                        // g.setIndex(Array(g.attributes.position.count).fill(0).map((x, i) => i < g.attributes.position.count / 2 ? i : 0));

                        // const positions = g.attributes.position.array;
                        // const nVerts = g.attributes.position.count;
                        // const nFaces = nVerts / 3;
                        // const indices = Array(nVerts).fill(0).map((x, i) => i);

                        // const pointReps = GeneratePointReps(indices, nFaces, positions, nVerts);
                        // const adjacency = ConvertPointRepsToAdjacencyImpl(indices, nFaces, positions, nVerts, pointReps);

                        // console.log(pointReps, adjacency);
                        // let ind = [];
                        // [3].forEach(iFace => {
                        //     let i0 = adjacency[iFace * 3 + 0];
                        //     let i1 = adjacency[iFace * 3 + 1];
                        //     let i2 = adjacency[iFace * 3 + 2];

                        //     //ind.push(indices[iFace * 3 + 0], indices[iFace * 3 + 1], indices[iFace * 3 + 2]);

                        //     [i0, i1, i2].filter(i => i != UNUSED32).forEach(iFace => {
                        //         ind.push(indices[iFace * 3 + 0], indices[iFace * 3 + 1], indices[iFace * 3 + 2]);
                        //     });
                        // });

                        // g.setIndex(ind);
                    });
                });
                scene.add(...this.groups);

                this.reloadMaterial();
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                this.groups = null;
            }
        );
    }

    componentDidMount() {
        super.componentDidMount({ grid: true });

        this.scene.background = new THREE.Color(0x333333);

        
        const scene = this.scene;
        const camera = this.camera;
        const params = this.params;
        const renderer = this.renderer;
        

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

        this.restoreSceneParams();

        renderer.toneMappingExposure = params.toneMappingExposure;
        bloomPass.threshold = params.bloomThreshold;
        bloomPass.strength = params.bloomStrength;
        bloomPass.radius = params.bloomRadius;

        this.composer = new EffectComposer(renderer);
        const composer = this.composer;
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        this.createSceneControls(bloomPass, renderer);

        this.createUniformGroups();
        this.createSingleUniforms();

        this.reloadModel();
    }

    shouldComponentUpdate(nextProps: IMaterialSceneProps, nexState) {
        return this.props.material !== nextProps.material;
    }

    // per pass x per buffer
    uniformGroups: THREE.UniformsGroup[][];

    // todo: read buffers layout from reflectio
    createUniformGroups() {
        const passCount = this.props.material.getPassCount();

        this.uniformGroups?.forEach(gs => gs.forEach(g => g.dispose()));
        this.uniformGroups = [];
        for (let p = 0; p < passCount; ++p) {
            const cbuffers = this.props.material?.getPass(p).getDesc().cbuffers;

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

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let prop = controls.props[name];
                uniforms[name] = { value: controlToThreeValue(val, prop.type) };
            }
        }
    }

    updateUniformsGroups() {
        const viewMatrix = this.camera.matrixWorldInverse;
        const projMatrix = this.camera.projectionMatrix;
        const viewprojMatrix = (new THREE.Matrix4).multiplyMatrices(projMatrix, viewMatrix).transpose();

        const { clientWidth, clientHeight } = this.mount;

        const passCount = this.props.material.getPassCount();
        const controls = this.props.controls;

        const timeline = this.props.timeline;
        const constants = timeline.getConstants();

        for (let p = 0; p < passCount; ++p) {
            const cbuffers = this.props.material?.getPass(p).getDesc().cbuffers;
            for (let c = 0; c < cbuffers.length; ++c) {
                let cbuf = cbuffers[c];
                let group = this.uniformGroups[p][c];
                let { name, size, usage } = cbuf;

                switch (name) {
                    case 'AUTOGEN_CONTROLS':
                        {
                            for (let { name, padding } of cbuf.fields) {
                                const pos = (padding / 16) >>> 0; // in vector
                                const prop = controls.props[name];
                                const val = controls.values[name];
                                // todo: use paddings (!)
                                group.uniforms[pos].value = controlToThreeValue(val, prop.type);
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
        let constants = timeline.getConstants();
        uniforms.elapsedTime.value = constants.elapsedTime;
        uniforms.elapsedTimeLevel.value = constants.elapsedTimeLevel;

        if (controls) {
            for (let name in controls.values) {
                let val = controls.values[name];
                let prop = controls.props[name];
                if (uniforms[name])
                    uniforms[name].value = controlToThreeValue(val, prop.type);
            }
        }
    }


    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);

        const passCount = this.props.material.getPassCount();

        this.scene.remove(...this.groups);
        if (passCount > 0) {
            this.groups = Array(passCount).fill(null).map(x => this.groups[0].clone(true) || null);
            this.scene.add(...this.groups);
        }

        this.reloadMaterial();
    }

    protected saveSceneParams() {
        const params = this.params;

        for (let prop in params) {
            localStorage[prop] = params[prop];
        }
    }

    protected restoreSceneParams() {
        const params = this.params;
        params.bloom = isString(localStorage.bloom) ? localStorage.bloom === 'true' : params.bloom;
        params.toneMappingExposure = Number(localStorage.toneMappingExposure || params.toneMappingExposure);
        params.bloomThreshold = Number(localStorage.bloomThreshold || params.bloomThreshold);
        params.bloomStrength = Number(localStorage.bloomStrength || params.bloomStrength);
        params.bloomRadius = Number(localStorage.bloomRadius || params.bloomRadius);

    }

    protected reloadMaterial() {
        const groups = this.groups;

        this.createUniformGroups(); // hack to avoid error: GL_INVALID_OPERATION: It is undefined behaviour to use a uniform buffer that is too small.

        for (let p = 0; p < this.props.material.getPassCount(); ++p) {
            const group = groups[p];
            const { vertexShader, pixelShader, renderStates } = this.props.material.getPass(p).getDesc();
            const uniforms = this.uniforms;

            const material = new THREE.RawShaderMaterial({
                uniforms,
                vertexShader: vertexShader,
                fragmentShader: pixelShader,
                blending: THREE.NormalBlending,
                transparent: false,
                depthTest: true
            });

            (material as any).uniformsGroups = this.uniformGroups[p];

            if (renderStates[ERenderStates.ZENABLE]) {
                material.depthTest = renderStates[ERenderStates.ZENABLE] === ERenderStateValues.TRUE;
            }

            if (renderStates[ERenderStates.BLENDENABLE]) {
                material.transparent = renderStates[ERenderStates.BLENDENABLE] === ERenderStateValues.TRUE;
            }

            if (renderStates[ERenderStates.CULLFACE]) {
                switch (renderStates[ERenderStates.CULLFACE]) {
                    case ERenderStateValues.FRONT:
                        material.side = THREE.FrontSide;
                        break;
                    case ERenderStateValues.BACK:
                        material.side = THREE.BackSide;
                        break;
                    case ERenderStateValues.FRONT_AND_BACK:
                        material.side = THREE.DoubleSide;
                        break;
                }
            }

            for (const object of group.children) {
                const mesh = object as THREE.Mesh;
                mesh.material = material;

                // IP: hack to support default geom layout like:
                // struct Geometry {
                //  float3 position: POSITION0;
                //  float3 normal: NORMAL0;
                //  float2 uv: TEXCOORD0;
                // };
                // console.log(mesh.geometry.attributes);
                // sandbox
                mesh.geometry.attributes['a_position0'] = mesh.geometry.attributes.position;
                mesh.geometry.attributes['a_normal0'] = mesh.geometry.attributes.normal;
                mesh.geometry.attributes['a_texcoord0'] = mesh.geometry.attributes.uv;
                // husky
                mesh.geometry.attributes['a_v_position'] = mesh.geometry.attributes.position;
                mesh.geometry.attributes['a_v_normal'] = mesh.geometry.attributes.normal;
                mesh.geometry.attributes['a_v_texcoord0'] = mesh.geometry.attributes.uv;
            }
        }
    }

    protected fillScene(time: number): void {
        this.updateUniformsGroups();
        this.updateSingleUniforms();

        const timeline = this.props.timeline;
        timeline.tick();
    }

    protected renderScene(time) {
        if (this.params.bloom) {
            this.composer.render();
        } else {
            super.renderScene(time);
        }
    }


    @autobind
    onWindowResize() {
        super.onWindowResize();
        const { clientWidth, clientHeight } = this.mount;
        this.composer.setSize(clientWidth, clientHeight);
    }
}

export default MaterialScene;
