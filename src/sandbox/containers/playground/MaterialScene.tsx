import ThreeScene, { IThreeSceneState, ITreeSceneProps } from './ThreeScene';

interface IMaterialSceneProps extends ITreeSceneProps {
    // todo
}


interface IMaterialSceneState extends IThreeSceneState {
    // todo
}


class MaterialScene extends ThreeScene<IMaterialSceneProps, IMaterialSceneState> {
    state: IMaterialSceneState;

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
}

export default MaterialScene;
