import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { IMap } from '@lib/idl/IMap';
import { ITechnique9 } from '@lib/idl/ITechnique9';
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import * as THREE from 'three';
import HDRScene from './HDRScene';
import { IThreeSceneState, ITreeSceneProps } from './ThreeScene';
import { ResourceDependencies } from './utils/deps';
import { div2Viewport, GroupedUniforms } from './utils/GroupedUniforms';
import { GuiView } from './utils/gui';
import { SingleUniforms } from './utils/SingleUniforms';


interface IProps extends ITreeSceneProps {
    controls?: IPlaygroundControlsState;
    material: ITechnique9;
}


interface IState extends IThreeSceneState {
    // todo
}

/** @deprecated */
class Technique9Scene extends HDRScene<IProps, IState> {
    protected groups: THREE.Group[];
    protected params: { model: string } = { model: 'probe' };

    protected gui = new GuiView;
    protected uniformGroups: GroupedUniforms = new GroupedUniforms;
    protected uniforms: IMap<THREE.IUniform>;
    protected deps = new ResourceDependencies;

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }


    private reloadModel() {
        const loader = new OBJLoader();
        const params = this.params;
        const passCount = this.props.material.getPassCount();
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
                    this.reloadMaterial();
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
        super.componentDidMount();

        this.gui.mount(this.mount);
        this.gui.create(this.props.controls);

        this.hdrControls.add(this.params, 'model', ['probe', 'cube', 'plane']).onChange((value) => {
            this.reloadModel();
        });

        this.uniforms = SingleUniforms.create(this.props.controls, this.deps);
        this.uniformGroups.create9(this.props.material);

        this.reloadModel();
        this.start();
    }


    shouldComponentUpdate(nextProps: IProps, nexState) {
        return this.props.material !== nextProps.material;
    }


    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);

        this.gui.create(this.props.controls);

        const passCount = this.props.material.getPassCount();

        this.scene.remove(...this.groups);
        if (passCount > 0) {
            this.groups = Array(passCount).fill(null).map(x => this.groups[0].clone(true) || null);
            this.scene.add(...this.groups);
        }

        this.reloadMaterial();
    }


    protected reloadMaterial() {
        const groups = this.groups;
        const controls = this.props.controls;

        const doLoadTexture = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('texture2d');
        const doLoadMeshes = Object.values(controls?.controls).map(ctrl => ctrl.type).includes('mesh');
        this.deps.resolve(doLoadTexture, doLoadMeshes);

        this.uniformGroups.create9(this.props.material); // hack to avoid error: GL_INVALID_OPERATION: It is undefined behaviour to use a uniform buffer that is too small.

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

            (material as any).uniformsGroups = this.uniformGroups.data()[p];

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


    protected override beginFrame(): void {
        const { timeline, controls, material } = this.props;
        const { deps, camera, mount } = this;
        const viewport = div2Viewport(mount);

        SingleUniforms.update(controls, timeline, deps, this.uniforms);
        this.uniformGroups.update9(camera, viewport, controls, timeline, deps, material);

        super.beginFrame();
    }
}

export default Technique9Scene;
