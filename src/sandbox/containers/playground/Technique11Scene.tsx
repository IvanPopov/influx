import { assert } from '@lib/common';
import { createSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import { CodeContextMode } from '@lib/fx/translators/CodeEmitter';
import { GLSLContext, GLSLEmitter } from '@lib/fx/translators/GlslEmitter';
import { EComparisonFunc, EDepthWriteMask, IDepthStencilState, IShader } from '@lib/idl/bytecode';
import { IMap } from '@lib/idl/IMap';
import { ITechnique11, ITechnique11RenderPass } from '@lib/idl/ITechnique11';
import { EUsage, IConstantBuffer } from "@lib/idl/ITechnique9";
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import HDRScene from './HDRScene';
import { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import { Deps } from './utils/deps';
import { GroupedUniforms } from './utils/GroupedUniforms';
import { GuiView } from './utils/gui';
import { SingleUniforms } from './utils/SingleUniforms';

import { CBBundleT } from '@lib/idl/bundles/auto/cbbundle';
import { PixelShaderT } from '@lib/idl/bundles/auto/fx/pixel-shader';
import { VertexShaderT } from '@lib/idl/bundles/auto/fx/vertex-shader';


interface IProps extends ITreeSceneProps {
    controls?: IPlaygroundControlsState;
    technique: ITechnique11;
}

const progressStyleFix: React.CSSProperties = {
    background: '#eee',
    borderRadius: '0'
};


interface IState extends IThreeSceneState {
    // todo
}


const makeCRCTable = () => {
    let c;
    let crcTable = [];
    for(let n =0; n < 256; n++){
        c = n;
        for(let k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

const CRC_TABLE = makeCRCTable();

const crc32 = (str) => {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};

interface IPso {
    vs: IShader;
    ps: IShader;
    depthStencilState: IDepthStencilState;
}

function calcPsoHash(pso: IPso): number {
    const dss = pso.depthStencilState;
    return crc32(
        `${pso.vs?.name}:${pso.vs?.args.map(a => `${a.value}`)}:` + 
        `${pso.ps?.name}:${pso.ps?.args.map(a => `${a.value}`)}:` + 
        `${dss?.DepthEnable}:${dss?.DepthFunc}:${dss?.DepthWriteMask}`
    );
}


function threeDepthFuncFromDSState(depthStencilState: IDepthStencilState): THREE.DepthModes {
    switch (depthStencilState.DepthFunc) {
        case EComparisonFunc.k_Always: return THREE.AlwaysDepth;
        case EComparisonFunc.k_Equal: return THREE.EqualDepth;
        case EComparisonFunc.k_Greater: return THREE.GreaterDepth;
        case EComparisonFunc.k_GreaterEqual: return THREE.GreaterEqualDepth;
        case EComparisonFunc.k_Less: return THREE.LessDepth;
        case EComparisonFunc.k_LessEqual: return THREE.LessEqualDepth;
        case EComparisonFunc.k_Never: return THREE.NeverDepth;
        case EComparisonFunc.k_NotEqual: return THREE.NotEqualDepth;
    }
    assert(false);
    return THREE.LessEqualDepth;
}
    

const scanCbuffer = (sharedCbufs: IMap<IConstantBuffer>, bundleCbs: CBBundleT[], usage: EUsage) => {
    for (let { name, slot, size, fields } of bundleCbs) {
        // skip same name buffers
        const cbuf = sharedCbufs[`${name}`] ||= {
            name: `${name}`, 
            slot,
            size, 
            usage,
            fields: fields.map(({ name, semantic, size, padding, type: { length } }) => 
                ({ 
                    name: `${name}`, 
                    semantic: `${semantic || name}`, 
                    size, 
                    padding, 
                    length 
                }))
        };
        cbuf.usage |= usage;
    }
};


class Technique11Scene extends HDRScene<IProps, IState> {
    groups: THREE.Group[];
    params: { model: string } = { model: 'probe' };

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    graphicsPso: IPso = {
        vs: null,
        ps: null,
        depthStencilState: null
    };

    materials: IMap<THREE.RawShaderMaterial> = {}; // by pso hash
    cbuffers: IMap<IConstantBuffer[]> = {};        // by pso hash
    uniformGroups: IMap<THREE.UniformsGroup[]> = {}
    uniforms: IMap<IMap<THREE.IUniform>> = {};

    gui = new GuiView;
    deps = new Deps;

    reloadModel() {
        const loader = new OBJLoader();
        const params = this.params;
        const passCount = this.props.technique.getPassCount();
        const scene = this.scene;

        this.scene.remove(...(this.groups || []));

        switch (params.model) {
            case 'plane':
                {
                    const geom = new THREE.PlaneGeometry(2, 2);
                    const mesh = new THREE.Mesh(geom, null);
                    const group = new THREE.Group();
                    group.add(mesh);

                    this.groups = [group];
                    scene.add(...this.groups);
                    return;
                }
                break;
        }

        loader.load(
            `./assets/models/${params.model}.obj`,
            (group: THREE.Group) => {

                this.groups = Array(passCount).fill(null).map(x => group.clone(true));
                this.groups.forEach(g => {
                    g.children.forEach(c => {
                        const m = c as THREE.Mesh;
                        const g = m.geometry;
                        // prepareTrimesh(g);
                    });
                });
                scene.add(...this.groups);
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

    setVertexShader(pass: ITechnique11RenderPass, shader: IShader) {
        if (!shader) {
            this.graphicsPso.vs = null;
            return;
        }

        this.graphicsPso.vs = shader;
    }

    setPixelShader(pass: ITechnique11RenderPass, shader: IShader) {
        if (!shader) {
            this.graphicsPso.ps = null;
            return;
        }

        this.graphicsPso.ps = shader;
    }

    setGeometryShader(pass: ITechnique11RenderPass, shader: IShader) {
        if (!shader) {
            // todo: reset shader
            return;
        }

        // console.log(pass.shaders.find(({ entryName }) => { return entryName === shader.name }));
    }

    setDepthStencilState(pass: ITechnique11RenderPass, state: IDepthStencilState, stencilRef: number) {
        // todo: apply stencilRef ?
        this.graphicsPso.depthStencilState = state;
    }


    bindTechnique(tech: ITechnique11) {
        const passNum = tech.getPassCount();

        for (let i = 0; i < passNum; ++ i) {
            const pass = tech.getPass(i);
            const render = pass.render;

            for (const { name, id } of render.getExterns()) {
                switch (name) {
                    case 'SetVertexShader': 
                        render.setExtern(id, this.setVertexShader.bind(this, pass));
                        break;
                    case 'SetPixelShader': 
                        render.setExtern(id, this.setPixelShader.bind(this, pass));
                        break;
                    case 'SetGeometryShader': 
                        render.setExtern(id, this.setGeometryShader.bind(this, pass));
                        break;
                    case 'SetDepthStencilState': 
                        render.setExtern(id, this.setDepthStencilState.bind(this, pass));
                        break;
                }
            }
        }
    }


    /** @deprecated */
    unbindTechnique(tech: ITechnique11) {

    }

    async componentDidMount() {
        super.componentDidMount();
        
        this.gui.mount(this.mount);
        
        // hack
        this.hdrControls.add(this.params, 'model', ['probe', 'cube', 'plane']).onChange((value) => {
            this.reloadModel();
        });
        
        this.reloadModel();
        this.bindTechnique(this.props.technique);

        const controls = this.props.controls;
        const doLoadTexture = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');
        this.deps.resolve(doLoadTexture, doLoadMeshes);

        this.start();
    }


    shouldComponentUpdate(nextProps: IProps, nexState) {
        return this.props.technique !== nextProps.technique;
    }

   
    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate?.(prevProps, prevState);

        const props = this.props;
        const passNum = props.technique.getPassCount();;

        this.scene.remove(...this.groups);
        if (passNum > 0) {
            this.groups = Array(passNum).fill(null).map(x => this.groups[0].clone(true) || null);
            this.scene.add(...this.groups);
        }

        this.unbindTechnique(prevProps.technique);
        this.bindTechnique(props.technique);
    }


    protected findCbuffers(csh: IShader, shaders: (PixelShaderT | VertexShaderT)[]): CBBundleT[] {
        return shaders.find(sh => sh.entryName == csh.name).cbuffers;
    }

    protected async precompileShader(csh: IShader, shaders: (PixelShaderT | VertexShaderT)[]): Promise<string> {
        const sh = shaders.find(sh => sh.entryName == csh.name);
        console.assert(sh, 'cannot find requested shader ?!');

        const textDocument = await createTextDocument('://raw', sh.code as string);
        const slDocument = await createSLDocument(textDocument);
        const scope = slDocument.root.scope;
        const ctx = new GLSLContext({ mode: csh.ver.substring(0, 2) as CodeContextMode });
        const codeGLSL = GLSLEmitter.translate(scope.findFunction(csh.name, null), ctx);
        // console.log(sh.code);
        // console.log(codeGLSL);
        return codeGLSL;
    }


    protected createUniforms(csh: IShader, shaders: (PixelShaderT | VertexShaderT)[]) {
        const sh = shaders.find(sh => sh.entryName == csh.name);
    }


    protected override async beginFrame() {
        const { timeline, controls, technique } = this.props;
        const { deps, camera, mount } = this;
        const passNum = technique.getPassCount();

        for (let i = 0; i < passNum; ++ i) {
            const { render, shaders } = technique.getPass(i);

            const psoHashPrev = calcPsoHash(this.graphicsPso);

            if (!timeline.isStopped() && !timeline.isPaused()) {
                render.play();
            }

            const psoHash = calcPsoHash(this.graphicsPso);

            if (!this.materials[psoHash]) {
                const { depthStencilState, vs, ps } = this.graphicsPso;
                
                // merge VS & PS constant buffer into shared list 
                // it's guaranteed by translator that buffers with the same name are the same
                const cbufs: IMap<IConstantBuffer> = {};
                scanCbuffer(cbufs, this.findCbuffers(vs, shaders), EUsage.k_Vertex);
                scanCbuffer(cbufs, this.findCbuffers(ps, shaders), EUsage.k_Pixel);

                const cbuffers = Object.values(cbufs);
                const ugroups = GroupedUniforms.create(cbuffers);
                const uniforms = SingleUniforms.create(controls, deps);
                
                const vertexShader = await this.precompileShader(vs, shaders);
                const fragmentShader = await this.precompileShader(ps, shaders);
                const mat = new THREE.RawShaderMaterial({
                    vertexShader,
                    fragmentShader,

                    uniforms,
                    blending: THREE.NormalBlending,
                    transparent: false,

                    depthTest: depthStencilState.DepthEnable,
                    depthWrite: depthStencilState.DepthWriteMask == EDepthWriteMask.k_All,
                    depthFunc: threeDepthFuncFromDSState(depthStencilState)
                });

                (mat as any).uniformsGroups = ugroups;

                this.materials[psoHash] = mat;
                this.cbuffers[psoHash] = cbuffers;
                this.uniformGroups[psoHash] = ugroups;
                this.uniforms[psoHash] = uniforms;

                console.log(`New PSO <${psoHash}> has been created.`);
                
            }

            if (psoHash !== psoHashPrev) {
                console.log(`switch pso <${psoHashPrev}> => <${psoHash}>`);
                this.gui.remove();
                this.gui.create(controls);
            }


            const groups = this.uniformGroups[psoHash];
            const cbuffers = this.cbuffers[psoHash];
            const uniforms = this.uniforms[psoHash];
            if (groups) {
                GroupedUniforms.update(camera, mount, controls, timeline, deps, groups, cbuffers);
                SingleUniforms.update(controls, timeline, deps, uniforms);
            }

            // todo: do not change material every frame (!)
            {
                const material = this.materials[psoHash];
                const group = this.groups?.[i];

                if (group) {
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

                        mesh.geometry.attributes['a_position'] = mesh.geometry.attributes.position;
                        mesh.geometry.attributes['a_normal'] = mesh.geometry.attributes.normal;
                        mesh.geometry.attributes['a_texcoord'] = mesh.geometry.attributes.uv;

                        // husky
                        mesh.geometry.attributes['a_v_position'] = mesh.geometry.attributes.position;
                        mesh.geometry.attributes['a_v_normal'] = mesh.geometry.attributes.normal;
                        mesh.geometry.attributes['a_v_texcoord0'] = mesh.geometry.attributes.uv;
                    }
                }
            }
        }

        // promote timeline
        super.beginFrame();
    }


    protected override endFrame(): void {
        // todo
    }

    render() {
        return (
            <div
                style={this.props.style}
                ref={(mount) => { this.mount = mount; }}
            >
                <Progress
                    value={100}
                    total={100}
                    attached='top'
                    size='medium'
                    indicating
                    style={progressStyleFix}
                />
            </div>
        );
    }
}

export default Technique11Scene;
