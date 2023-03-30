import { assert, isDefAndNotNull } from '@lib/common';
import { i32ToU8Array } from '@lib/fx/bytecode/common';
import { createSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import { ITimeline } from '@lib/fx/timeline';
import { CodeContextMode } from '@lib/fx/translators/CodeEmitter';
import { GLSLContext, GLSLEmitter } from '@lib/fx/translators/GlslEmitter';
import { EComparisonFunc, EDepthWriteMask, IDepthStencilState, IShader } from '@lib/idl/bytecode';
import { IDepthStencilView } from '@lib/idl/bytecode/IDepthStencilView';
import { ERenderTargetFormats, IRenderTargetView } from '@lib/idl/bytecode/IRenderTargetView';
import { IMap } from '@lib/idl/IMap';
import { ITechnique11, ITechnique11RenderPass } from '@lib/idl/ITechnique11';
import { crc32 } from '@lib/util/crc32';
import { ASSETS_PATH } from '@sandbox/logic/common';
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import React from 'react';
import { Progress } from 'semantic-ui-react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import HDRScene from './HDRScene';
import * as GLSL from './shaders/fx';
import { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import { ResourceDependencies } from './utils/deps';
import { div2Viewport, GroupedUniforms, IViewport } from './utils/GroupedUniforms';
import { GuiView } from './utils/gui';
import { SingleUniforms } from './utils/SingleUniforms';

import { createDepthStencilState } from '@lib/fx/bytecode/PipelineStates';
import { CBBundleT } from '@lib/idl/bundles/auto/cbbundle';
import { PixelShaderT } from '@lib/idl/bundles/auto/fx/pixel-shader';
import { VertexShaderT } from '@lib/idl/bundles/auto/fx/vertex-shader';
import { TextureBundleT } from '@lib/idl/bundles/auto/texture-bundle';
import { EUsage, IConstantBuffer, ITexture } from '@lib/idl/ITechnique';
import { Uniforms } from '@lib/idl/Uniforms';
import UniformHelper from '@lib/fx/UniformHelper';

const Shaders = (id: string) => GLSL[id];

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


// track all infly RTs in order to not interfer with them while reading texture
class ActiveRTs {
    activeRTs: Record<string, IRenderTargetView> = {};

    // reset active list on this frame
    reset () {
        this.activeRTs = {};
    }

    // add active RT on this frame
    add(rtv) {
        if (rtv) {
            this.activeRTs[rtv.name] = rtv;
        }
    }

    // unbind all texture linked with active RTs
    unbindTextures(graphicsPso: GraphicsPipelineStateObject) {
        for (let rtName in this.activeRTs) {
            const texUniform = graphicsPso.uniforms[this.activeRTs[rtName].texture];
            if (texUniform) {
                texUniform.value = null;
            }
        }
    }
}


class ShaderDesc {
    // source code precomputed crc32
    constructor(public csh: IShader, public crc32: number) { }
}


class GraphicsPipelineStateDesc {
    vs = new ShaderDesc(null, 0);
    ps = new ShaderDesc(null, 0);
    depthStencilState: IDepthStencilState = GraphicsPipelineStateDesc.DEPTH_STENCIL_STATE_DEFAULT;
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

    static DEPTH_STENCIL_STATE_DEFAULT = createDepthStencilState();
}


function rt2Viewport({ width, height }: THREE.WebGLRenderTarget): IViewport {
    return { width, height };
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


const scanTexture = (sharedTextures: IMap<ITexture>, bundleTextures: TextureBundleT[], usage: EUsage) => {
    for (let { name, slot } of bundleTextures) {
        // skip same name buffers
        const tex = sharedTextures[`${name}`] ||= {
            name: `${name}`,
            slot,
            usage,
        };
        tex.usage |= usage;
    }
};


function findCbuffers(csh: IShader, pass: ITechnique11RenderPass): CBBundleT[] {
    return pass.shaders.find(sh => sh.entryName == csh.name).cbuffers;
}

function findTextures(csh: IShader, pass: ITechnique11RenderPass): TextureBundleT[] {
    return pass.shaders.find(sh => sh.entryName == csh.name).textures;
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
    // console.log(code);
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


class RenderPassDriver {
    graphicsPsoDesc: GraphicsPipelineStateDesc = new GraphicsPipelineStateDesc;

    
    constructor(public pass: ITechnique11RenderPass, public name: string) {
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
                    render.setExtern(id, this.setRenderTargets.bind(this, pass));
                    break;
            }
        }
    }


    reset() {
        const pass = this.pass;
        this.setRenderTargets(pass, null, null);
        this.setVertexShader(pass, null);
        this.setPixelShader(pass, null);
        this.setDepthStencilState(pass, GraphicsPipelineStateDesc.DEPTH_STENCIL_STATE_DEFAULT, 0);
    }


    apply(uniforms: Uniforms) {
        for (const name in uniforms) {
            this.pass.render.setConstant(name, uniforms[name]);
        }
        this.pass.render.play();
    }

    ///

    setRenderTargets(pass: ITechnique11RenderPass, rtv: IRenderTargetView, dsv: IDepthStencilView) {
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


function createRenderPassDrivers(tech: ITechnique11) {
    const passNum = tech.getPassCount();
    const renderPasses = [];
    for (let i = 0; i < passNum; ++i) {
        const pass = tech.getPass(i);
        renderPasses.push(new RenderPassDriver(pass, `pass-${i}`));
    }
    return renderPasses;
}


async function precompileGraphicsPso(
    driver: RenderPassDriver,
    deps: ResourceDependencies,
    controls: IPlaygroundControlsState
): Promise<GraphicsPipelineStateObject> {
    const pass = driver.pass;
    const desc = driver.graphicsPsoDesc;
    const hash = desc.hash();
    const { depthStencilState, vs, ps } = desc;

    // merge VS & PS constant buffer into shared list 
    // it's guaranteed by translator that buffers with the same name are the same
    const cbufs: IMap<IConstantBuffer> = {};
    scanCbuffer(cbufs, findCbuffers(vs.csh, pass), EUsage.k_Vertex);
    scanCbuffer(cbufs, findCbuffers(ps.csh, pass), EUsage.k_Pixel);

    // merge VS & PS textures into shared list 
    // it's guaranteed by translator that buffers with the same name are the same
    const texs: IMap<ITexture> = {};
    scanTexture(texs, findTextures(vs.csh, pass), EUsage.k_Vertex);
    scanTexture(texs, findTextures(ps.csh, pass), EUsage.k_Pixel);

    const cbuffers = Object.values(cbufs);
    const textures = Object.values(texs);
    const ugroups = GroupedUniforms.create(cbuffers);
    const uniforms = SingleUniforms.create(controls, deps, textures);

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


function relinkThreeMeshAttributes(group: THREE.Group) {
    if (!group) {
        return;
    }

    for (const object of group.children) {
        const mesh = object as THREE.Mesh;

        // IP: hack to support default geom layout like:
        // struct Geometry {
        //  float3 position: POSITION0;
        //  float3 normal: NORMAL0;
        //  float2 uv: TEXCOORD0;
        // };

        const attrs = { 
        //    "THREE"         "SANDBOX"      "SANDBOX"      "HUSKY" 
            'position'  : [ 'a_position0', 'a_position'  , 'a_v_position'   ],
            'normal'    : [ 'a_normal0'  , 'a_normal'    , 'a_v_normal'     ],
            'uv'        : [ 'a_texcoord0', 'a_texcoord'  , 'a_v_texcoord'   ]
        };

        for (const src in attrs) {
            for (const dst of attrs[src]) {
                mesh.geometry.attributes[dst] = mesh.geometry.attributes[src];
            }
        }
    }
}

function overrideGroupMaterial(group: THREE.Group, mat: THREE.Material) {
    if (!mat || !group) {
        return;
    }

    for (const object of group.children) {
        const mesh = object as THREE.Mesh;
        mesh.material = mat;
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


function createRenderTarget(name: string, width: number = 1024, height: number = 1024, 
    format: THREE.PixelFormat = THREE.RGBAFormat, type: THREE.TextureDataType = THREE.FloatType): THREE.WebGLRenderTarget {
    // note: depth texture will be create automatically (!)
    const parameters: THREE.WebGLRenderTargetOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format,
        type
    };

    const rt = new THREE.WebGLRenderTarget(width, height, parameters);
    
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
relinkThreeMeshAttributes(rttQuad);

/** Dedicated render to texture scene of single object. */
const rttScene = createRenderToTextureScene(rttQuad);


interface IRTViewProps {
    aspect?: number; // w / h
    size?: number;
    x?: number;
    y?: number;
    texture: THREE.Texture;
}

function createRTViewerMaterial({ aspect = 1, size = 1, x = 0, y = 0, texture }: IRTViewProps) {
    return new THREE.RawShaderMaterial({
        uniforms: {
            aspect: { value: aspect },
            offset: { value: new THREE.Vector2(x, y) },
            size: { value: size },
            map: { value: texture }
        },
        vertexShader: Shaders('rtvVS'),
        fragmentShader: Shaders('rtvFS'),
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
}

function createRTViewer(props: IRTViewProps) {
    const mat = createRTViewerMaterial(props);
    const plane = createPlane();
    plane.renderOrder = 0xFFFFFFFF; // render at the end
    overrideGroupMaterial(plane, mat);
    return plane;
}

function overrideRTViewerUniform(viewer: THREE.Group, name: string, value: any) {
    ((viewer.children[0] as THREE.Mesh).material as THREE.RawShaderMaterial).uniforms[name].value = value;
}

function overrideRTViewerTexture(viewer: THREE.Group, tex: THREE.Texture) {
    overrideRTViewerUniform(viewer, 'map', tex);
}

class Technique11Scene extends HDRScene<IProps, IState> {
    probe: THREE.Group;

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    drivers: RenderPassDriver[];
    graphicsPsoCache: Record<string, GraphicsPipelineStateObject> = {};
    dynamicTargets: Record<string, THREE.WebGLRenderTarget> = {};
    dynamicTextures: Record<string, THREE.Texture> = {};
    rtvsRenderToScreen: Record<string, boolean> = {};


    gui = new GuiView;

    /** Dependencies: textures and models. */
    resources = new ResourceDependencies;


    precreateDynamicTarget(rtv: IRenderTargetView, width: number = 1024, height: number = 1024): THREE.WebGLRenderTarget {
        if (!rtv) {
            return null;
        }
        let rt = this.dynamicTargets[rtv.name];

        const ttp: Record<ERenderTargetFormats, THREE.PixelFormat> = {
            [ERenderTargetFormats.k_rgba8]: THREE.RGBAFormat,
            [ERenderTargetFormats.k_rgba32]: THREE.RGBAFormat,
        };

        const tft: Record<ERenderTargetFormats, THREE.TextureDataType> = {
            [ERenderTargetFormats.k_rgba8]: THREE.UnsignedByteType,
            [ERenderTargetFormats.k_rgba32]: THREE.FloatType,
        };

        if (!rt) {
            rt = this.dynamicTargets[rtv.name] = createRenderTarget(rtv.name, width, height, ttp[rtv.format], tft[rtv.format]);
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

            relinkThreeMeshAttributes(this.probe);

            this.scene.add(this.probe);
        };

        const params = { model: 'probe' };
        this.hdrControls.add(params, 'model', ['probe', 'cube', 'plane']).onChange(onModelChanged);
        onModelChanged(params.model);
    }


    createRTVsDebugUi() {
        const { mount, scene, dynamicTargets, rtvsRenderToScreen } = this;
        const { technique } = this.props;
        const aspect = mount.clientWidth / mount.clientHeight;
        const px = t => t;
        const py = t => t * aspect;   
        
        for (let i = 0; i < technique.getPassCount(); ++ i) {
            const pass = technique.getPass(i);
            const rtvs = pass.render.getRenderTargets();
            for (const rtv of rtvs) {
                rtvsRenderToScreen[rtv.name] = false;
            }
        }
        
        const pad = 0.025; // pad between targets
        const size = 0.25; // size of target (% of width)

        const { gui } = this.gui;
        const rtFodler = gui.addFolder(`[render targets]`);
        Object.keys(rtvsRenderToScreen).forEach((name, i) => {
            const x = 1.0 - px(size) - px(pad);
            const y = 1.0 - py(size) - py(pad) - py((pad + size) * i);
            const rtViewer = createRTViewer({ size, x, y, aspect, texture: null });
            
            rtFodler.add(rtvsRenderToScreen, name).onChange(value => {
                // dynamic texture are created on demand (by requests from bytecode)
                const rt = dynamicTargets?.[name];
                if (!rt) {
                    console.error(`Render target <${name}> doesn't exist.`);
                    return;
                }
                const tex = rt.texture || null;
                // todo: add resize support
                overrideRTViewerTexture(rtViewer, tex);

                if (value) {
                    scene.add(rtViewer);
                } else {
                    scene.remove(rtViewer);
                }
            });
        });
    }


    componentDidMount() {
        super.componentDidMount();

        this.gui.mount(this.mount);

        this.loadProbe();

        const { technique, controls } = this.props;

        
        const doLoadTexture = true;//Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');
        this.resources.resolve(doLoadTexture, doLoadMeshes);
        
        this.drivers = createRenderPassDrivers(technique);
        
        this.gui.create(controls);
        this.createRTVsDebugUi(); // todo: move on inside GuiView ?
        
        this.start();
    }


    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate?.(prevProps, prevState);

        const { technique, controls } = this.props;
        if (prevProps.technique !== technique) {
            console.info(`Technique 11 scene has been updated.`);
            this.drivers = createRenderPassDrivers(technique);

            this.gui.remove();
            this.gui.create(controls);
        }
    }


    /** Create new PSO if needed. */
    async precompileGrapicsPso(
        driver: RenderPassDriver,
        resources: ResourceDependencies,
        controls: IPlaygroundControlsState) {
        const desc = driver.graphicsPsoDesc;
        const hash = desc.hash();
        let pso = this.graphicsPsoCache[hash];
        if (!pso) {
            pso = this.graphicsPsoCache[hash]
                = await precompileGraphicsPso(driver, resources, controls);
        }
        return pso;
    }


    protected setupRenderConstans() {
        const { timeline } = this.props;

        // todo: get out constants setup
        const frameNumber = timeline.getConstants().frameNumber;
        
        const helper = UniformHelper();
        helper.set('FRAME_NUMBER').int(frameNumber);
        const uniforms = helper.finish();
        return uniforms;
    }


    protected async renderFrame() {
        if (!this.probe) {
            // todo: show loading
            super.renderFrame(); // render empty scene
            return;
        }

        const { timeline, controls } = this.props;
        const { resources, camera, mount, dynamicTextures, drivers, probe, renderer } = this;
        const originalRT = renderer.getRenderTarget();

        const activeRTs = new ActiveRTs();

        for (const passDriver of drivers) {

            const { graphicsPsoDesc } = passDriver;
            
            const psoHashPrev = graphicsPsoDesc.hash();
            
            activeRTs.reset();
            passDriver.reset(); // reset pipeline state
            renderer.setRenderTarget(originalRT);
            
            const uniforms = this.setupRenderConstans();
            passDriver.apply(uniforms);
            
            if (!graphicsPsoDesc.isVlaid()) {
                console.warn(`Invalid graphics pass <${passDriver.name}> has bee applied.`);
                continue;
            }
            
            const psoHash = graphicsPsoDesc.hash();
            if (psoHash !== psoHashPrev) {
                console.log(`switch pso <${psoHashPrev}> => <${psoHash}>`);
            }
            
            const currentRT = this.precreateDynamicTarget(graphicsPsoDesc.rtv); // 1024 x 1024
            renderer.setRenderTarget(currentRT);

            const viewport = currentRT ? rt2Viewport(currentRT) : div2Viewport(mount);
            const graphicsPso = await this.precompileGrapicsPso(passDriver, resources, controls);
            
            graphicsPso.setUniforms(resources, camera, viewport, controls, timeline, dynamicTextures);

            activeRTs.add(graphicsPsoDesc.rtv);
            activeRTs.unbindTextures(graphicsPso);
            
            if (currentRT) {
                overrideGroupMaterial(rttQuad, graphicsPso.material);
                renderer.render(rttScene, camera); // note: render without composer or any additional passes
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
