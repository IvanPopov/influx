
import { ITechnique11 } from '@lib/idl/ITechnique11';
import { IPlaygroundControlsState } from '@sandbox/store/IStoreState';
import * as THREE from 'three';
import HDRScene from './HDRScene';
import { IThreeSceneState, ITreeSceneProps } from './ThreeScene';


interface IProps extends ITreeSceneProps {
    controls?: IPlaygroundControlsState;
    technique: ITechnique11;
}


interface IState extends IThreeSceneState {
    // todo
}


class Technique11Scene extends HDRScene<IProps, IState> {
    groups: THREE.Group[];

    constructor(props) {
        super(props);

        this.state = {
            // todo
            ...this.stateInitials()
        };
    }

    componentDidMount() {
        super.componentDidMount();
    }


    shouldComponentUpdate(nextProps: IProps, nexState) {
        return this.props.technique !== nextProps.technique;
    }

   
    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);
    }


    protected override beginFrame(): void {
        // this.updateUniformsGroups(this.props.technique);
        // this.updateSingleUniforms();

        super.beginFrame();
    }
}

export default Technique11Scene;
