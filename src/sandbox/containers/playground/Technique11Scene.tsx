import { assert, isDefAndNotNull } from '@lib/common';
import { createSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import { ITimeline } from '@lib/fx/timeline';
import { CodeContextMode } from '@lib/fx/translators/CodeEmitter';
import { GLSLContext, GLSLEmitter } from '@lib/fx/translators/GlslEmitter';
import { EComparisonFunc, EDepthWriteMask, IDepthStencilState, IShader } from '@lib/idl/bytecode';
import { IDepthStencilView } from '@lib/idl/bytecode/IDepthStencilView';
import { IRenderTargetView } from '@lib/idl/bytecode/IRenderTargetView';
import { IMap } from '@lib/idl/IMap';
import { ITechnique11, ITechnique11RenderPass } from '@lib/idl/ITechnique11';
import { EUsage, IConstantBuffer } from "@lib/idl/ITechnique9";
import { crc32 } from '@lib/util/crc32';
import { ASSETS_PATH } from '@sandbox/logic/common';
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import HDRScene from './HDRScene';
import { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import { ResourceDependencies } from './utils/deps';
import { GroupedUniforms, IViewport } from './utils/GroupedUniforms';
import { GuiView } from './utils/gui';
import { SingleUniforms } from './utils/SingleUniforms';

import { createDepthStencilState } from '@lib/fx/bytecode/PipelineStates';
import { CBBundleT } from '@lib/idl/bundles/auto/cbbundle';
import { PixelShaderT } from '@lib/idl/bundles/auto/fx/pixel-shader';
import { VertexShaderT } from '@lib/idl/bundles/auto/fx/vertex-shader';


const STATS_CSS_PROPS: React.CSSProperties = {
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


interface IProps extends ITreeSceneProps {
    /** User controls. */
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



class ShaderDesc {
    // source code precomputed crc32
    constructor(public csh: IShader, public crc32: number) { }
}



class GraphicsPipelineStateDesc {
    vs = new ShaderDesc(null, 0);
    ps = new ShaderDesc(null, 0);
    depthStencilState: IDepthStencilState = createDepthStencilState();
    rtv: IRenderTargetView = null;


    isVlaid(): boolean {
        // todo: use more precise check
        return isDefAndNotNull(this.vs.csh) && isDefAndNotNull(this.ps.csh);
    }


    hash() {
        const { depthStencilState: dss, vs, ps } = this;
        return crc32(
            `${vs.crc32}:${vs.csh?.name}:${vs.csh?.args.map(a => `${a.value}`)}:` +
            `${ps.crc32}:${ps.csh?.name}:${ps.csh?.args.map(a => `${a.value}`)}:` +
            `${dss?.DepthEnable}:${dss?.DepthFunc}:${dss?.DepthWriteMask}`
        );
    }
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


function findCbuffers(csh: IShader, pass: ITechnique11RenderPass): CBBundleT[] {
    return pass.shaders.find(sh => sh.entryName == csh.name).cbuffers;
}

function findShader(csh: IShader, pass: ITechnique11RenderPass): VertexShaderT | PixelShaderT {
    return pass.shaders.find(sh => sh.entryName == csh.name);
}

function findShaderCrc32(csh: IShader, pass: ITechnique11RenderPass): number {
    return findShader(csh, pass)?.crc32 || 0;
}


async function precompileShader(csh: IShader, pass: ITechnique11RenderPass): Promise<string> {
    const code = findShader(csh, pass).code as string;
    // todo: tranlsate offline ?
    const textDocument = await createTextDocument('://raw', code as string);
    const slDocument = await createSLDocument(textDocument);
    const scope = slDocument.root.scope;
    const ctx = new GLSLContext({ mode: csh.ver.substring(0, 2) as CodeContextMode });
    const codeGLSL = GLSLEmitter.translate(scope.findFunction(csh.name, null), ctx);
    // console.log(sh.code);
    // console.log(codeGLSL);
    return codeGLSL;
}



class GraphicsPipelineStateObject {
    constructor(
        public material: THREE.RawShaderMaterial,
        public cbuffers: IConstantBuffer[],
        public uniformGroups: THREE.UniformsGroup[],
        public uniforms: IMap<THREE.IUniform>
    ) { }


    setUniforms(
        resources: ResourceDependencies, 
        camera: THREE.PerspectiveCamera, 
        viewport: IViewport, 
        controls: IPlaygroundControlsState, 
        timeline: ITimeline,
        dynamicTextures?: Record<string, THREE.Texture>
        ) {
        const { uniformGroups, uniforms, cbuffers } = this;
        GroupedUniforms.update(camera, viewport, controls, timeline, resources, uniformGroups, cbuffers);
        SingleUniforms.update(controls, timeline, resources, uniforms, dynamicTextures);
    }
}


class RenderPass {
    graphicsPsoDesc: GraphicsPipelineStateDesc = new GraphicsPipelineStateDesc;

    constructor(pass: ITechnique11RenderPass) {
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
                case 'SetRenderTargets':
                    render.setExtern(id, this.setRenderTargets.bind(this));
                    break;
            }
        }
    }


    setRenderTargets(rtv: IRenderTargetView, dsv: IDepthStencilView) {
        this.graphicsPsoDesc.rtv = rtv;
    }


    setVertexShader(pass: ITechnique11RenderPass, csh: IShader) {
        const sh = this.graphicsPsoDesc.vs;
        sh.csh = null;

        if (!csh) {
            return;
        }

        const hash = findShaderCrc32(csh, pass);
        if (hash == 0) {
            console.error(`Could not find shader <${csh.name}>.`);
            return;
        }

        sh.csh = csh;
        sh.crc32 = hash;
    }


    setPixelShader(pass: ITechnique11RenderPass, csh: IShader) {
        const sh = this.graphicsPsoDesc.ps;
        sh.csh = null;

        if (!csh) {
            return;
        }

        const hash = findShaderCrc32(csh, pass);
        if (hash == 0) {
            console.error(`Could not find shader <${csh.name}>.`);
            return;
        }

        sh.csh = csh;
        sh.crc32 = hash;
    }


    setGeometryShader(pass: ITechnique11RenderPass, csh: IShader) {
        // const sh = this.graphicsPsoDesc.cs;

        // if (!csh) {
        //     sh.csh = null;
        //     return;
        // }

        // console.log(pass.shaders.find(({ entryName }) => { return entryName === shader.name }));
    }


    setDepthStencilState(pass: ITechnique11RenderPass, state: IDepthStencilState, stencilRef: number) {
        // todo: apply stencilRef ?
        this.graphicsPsoDesc.depthStencilState = state;
    }
}


function createRenderPasses(tech: ITechnique11) {
    const passNum = tech.getPassCount();
    const renderPasses = [];
    for (let i = 0; i < passNum; ++i) {
        const pass = tech.getPass(i);
        renderPasses.push(new RenderPass(pass));
    }
    return renderPasses;
}


async function precompileGraphicsPso(
    desc: GraphicsPipelineStateDesc,
    pass: ITechnique11RenderPass,
    deps: ResourceDependencies,
    controls: IPlaygroundControlsState
): Promise<GraphicsPipelineStateObject> {
    const hash = desc.hash();
    const { depthStencilState, vs, ps } = desc;

    // merge VS & PS constant buffer into shared list 
    // it's guaranteed by translator that buffers with the same name are the same
    const cbufs: IMap<IConstantBuffer> = {};
    scanCbuffer(cbufs, findCbuffers(vs.csh, pass), EUsage.k_Vertex);
    scanCbuffer(cbufs, findCbuffers(ps.csh, pass), EUsage.k_Pixel);

    const cbuffers = Object.values(cbufs);
    const ugroups = GroupedUniforms.create(cbuffers);
    const uniforms = SingleUniforms.create(controls, deps);

    const vertexShader = await precompileShader(vs.csh, pass);
    const fragmentShader = await precompileShader(ps.csh, pass);
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

    console.log(`%cPSO <${hash}> has been created.`, 'background: #222; color: #bada55');
    return new GraphicsPipelineStateObject(mat, cbuffers, ugroups, uniforms);
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


function overrideGroupMaterial(group: THREE.Group, mat: THREE.RawShaderMaterial) {
    if (!mat || !group) {
        return;
    }

    for (const object of group.children) {
        const mesh = object as THREE.Mesh;
        mesh.material = mat;

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


function createPlane(): THREE.Group {
    const geom = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geom, null);
    const group = new THREE.Group();
    group.add(mesh);
    return group;
}


async function loadObjModel(name: string): Promise<THREE.Group> {
    const loader = new OBJLoader();
    return new Promise((resolve, reject) => {
        loader.load(
            `${ASSETS_PATH}/models/${name}.obj`,
            resolve,
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            reject
        );
    });
}


function createRenderTarget(name: string, width: number, height: number, renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    // note: depth texture will be create automatically (!)
    const parameters: THREE.WebGLRenderTargetOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType
    };

    const pixelRatio = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, parameters);

    console.log(`New render target <${name} ${width}x${height}> has been created.`);
    return rt;
}


function createRenderToTextureScene(quad: THREE.Group) {
    const scene = new THREE.Scene();
    scene.add(quad);
    return scene;
}

/** Render to texture quad object. */
const rttQuad = createPlane();
/** Dedicated render to texture scene of single object. */
const rttScene = createRenderToTextureScene(rttQuad);

class Technique11Scene extends HDRScene<IProps, IState> {
    probe: THREE.Group;

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    passes: RenderPass[];
    graphicsPsoCache: Record<string, GraphicsPipelineStateObject> = {};
    dynamicTargets: Record<string, THREE.WebGLRenderTarget> = {};
    dynamicTextures: Record<string, THREE.Texture> = {};
    rtvsRenderToScreen: Record<string, boolean> = {};


    gui = new GuiView;

    /** Dependencies: textures and models. */
    resources = new ResourceDependencies;


    precreateDynamicTarget(rtv: IRenderTargetView, width: number, height: number): THREE.WebGLRenderTarget {
        if (!rtv) {
            return null;
        }
        let rt = this.dynamicTargets[rtv.name];
        if (!rt) {
            rt = this.dynamicTargets[rtv.name] = createRenderTarget(rtv.name, width, height, this.renderer);
            if (rtv.texture) {
                this.dynamicTextures[rtv.texture] = rt.texture;
            }
        }
        return rt;
    }


    loadProbe() {
        const onModelChanged = async (name: string) => {
            if (this.probe) {
                this.scene.remove(this.probe);
            }

            switch (name) {
                case 'plane':
                    this.probe = createPlane();
                    break;
                default:
                    this.probe = await loadObjModel(name);
            }

            this.scene.add(this.probe);
        };

        const params = { model: 'probe' };
        this.hdrControls.add(params, 'model', ['probe', 'cube', 'plane']).onChange(onModelChanged);
        onModelChanged(params.model);
    }


    createRTVsDebugUi() {
        const { technique } = this.props;

        for (let i = 0; i < technique.getPassCount(); ++ i) {
            const pass = technique.getPass(i);
            const rtvs = pass.render.getRenderTargets();
            for (const rtv of rtvs) {
                this.rtvsRenderToScreen[rtv.name] = false;
            }
        }
        
        const { gui } = this.gui;
        const rtFodler = gui.addFolder(`[render targets]`);
        Object.keys(this.rtvsRenderToScreen).forEach(name => {
            rtFodler.add(this.rtvsRenderToScreen, name);
        });
    }


    componentDidMount() {
        super.componentDidMount();

        this.gui.mount(this.mount);

        this.loadProbe();

        const { technique, controls } = this.props;

        
        const doLoadTexture = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');
        this.resources.resolve(doLoadTexture, doLoadMeshes);
        
        this.passes = createRenderPasses(technique);
        
        this.gui.create(controls);
        this.createRTVsDebugUi(); // todo: move on inside GuiView ?
        
        this.start();
    }


    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate?.(prevProps, prevState);

        const { technique, controls } = this.props;
        if (prevProps.technique !== technique) {
            console.info(`Technique 11 scene has been updated.`);
            this.passes = createRenderPasses(technique);

            this.gui.remove();
            this.gui.create(controls);
        }
    }


    /** Create new PSO if needed. */
    async precompileGrapicsPso(
        desc: GraphicsPipelineStateDesc,
        pass: ITechnique11RenderPass,
        resources: ResourceDependencies,
        controls: IPlaygroundControlsState) {
        const hash = desc.hash();
        let pso = this.graphicsPsoCache[hash];
        if (!pso) {
            pso = this.graphicsPsoCache[hash]
                = await precompileGraphicsPso(desc, pass, resources, controls);
        }
        return pso;
    }


    protected async renderFrame() {
        if (!this.probe) {
            // todo: show loading
            super.renderFrame(); // render empty scene
            return;
        }

        const { timeline, controls, technique } = this.props;
        const { resources, camera, mount, dynamicTextures } = this;
        const passNum = technique.getPassCount();

        for (let i = 0; i < passNum; ++i) {
            const pass = technique.getPass(i);

            const { render } = pass;
            const { graphicsPsoDesc } = this.passes[i];

            const psoHashPrev = graphicsPsoDesc.hash();

            render.play();

            if (!graphicsPsoDesc.isVlaid()) {
                console.warn(`Invalid graphics pass <P${i}> has bee applied.`);
                continue;
            }

            const psoHash = graphicsPsoDesc.hash();
            if (psoHash !== psoHashPrev) {
                console.log(`switch pso <${psoHashPrev}> => <${psoHash}>`);
            }

            const graphicsPso = await this.precompileGrapicsPso(graphicsPsoDesc, pass, resources, controls);
            graphicsPso.setUniforms(resources, camera, mount, controls, timeline, dynamicTextures);

            ///////////////////////////////////////////////

            const { probe, renderer } = this;

            const currentRT = this.precreateDynamicTarget(graphicsPsoDesc.rtv, mount.clientWidth, mount.clientHeight);
            const renderToTexture = currentRT !== null;

            if (renderToTexture) {
                const originalRT = renderer.getRenderTarget();
                renderer.setRenderTarget(currentRT);

                overrideGroupMaterial(rttQuad, graphicsPso.material);
                renderer.render(rttScene, camera); // note: render without composer or any additional passes

                renderer.setRenderTarget(originalRT);
                continue;
            } else {
                overrideGroupMaterial(probe, graphicsPso.material);
                super.renderFrame();
            }
        }

        timeline.tick();
    }

    @autobind
    protected override animate(time: DOMHighResTimeStamp) {
        this.begin();

        this.orbitControls.update();
        this.renderFrame();
        this.frameId = requestAnimationFrame(this.animate);

        this.end();
    }

    protected override beginFrame(): void {
        assert(false);
    }

    protected override endFrame(): void {
        assert(false);
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
                <div style={STATS_CSS_PROPS}>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fps: <span>{Math.round(this.state.fps.value)}</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;time: <span>{this.props.timeline.getConstants().elapsedTimeLevel.toFixed(2)}</span><br />
                </div>
            </div>
        );
    }
}

export default Technique11Scene;
