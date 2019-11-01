/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, List, Message } from 'semantic-ui-react';
import Pipeline from './Pipeline';
import ThreeScene from './ThreeScene';


interface IPlaygroundProps extends IFileState {
    actions: typeof sourceActions;
}



// TODO: remove it
const threeStylesHotfix: React.CSSProperties = {
    height: 'calc(100vh - 275px - 1em)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '1em -20px -20px -20px'
};


class Playground extends React.Component<IPlaygroundProps> {
    $pipelineName: string = null;

    constructor(props) {
        super(props);
    }

    // static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
    //     return null;
    // }

    @autobind
    handlePlayClick() {
        const props = this.props;
        if (props.pipeline) {
            if (props.pipeline.isStopped()) {
                props.pipeline.play();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.pipeline) {
            if (!props.pipeline.isStopped()) {
                props.pipeline.stop();
                this.forceUpdate();
            }
        }
    }


    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.pipeline !== this.props.pipeline || 
        (this.props.pipeline && this.$pipelineName !== this.props.pipeline.name());
    }

    componentDidUpdate() {
        this.$pipelineName = this.props.pipeline.name();
    }


    render() {
        // console.log('Playground:render()');
        const pipeline = this.props.pipeline as ReturnType<typeof Pipeline>;
        const scope = this.props.analysis ? this.props.analysis.scope : null;

        const list: IPartFxInstruction[] = [];
        const active = pipeline ? pipeline.name() : null;

        if (scope) {
            for (const name in scope.techniqueMap) {
                const tech = scope.techniqueMap[name];
                if (tech.type !== ETechniqueType.k_PartFx) {
                    continue;
                }
                list.push(tech as IPartFxInstruction);
            }
        }

        return (
            <div>
                { !list.length &&
                    <Message info textAlign='center'>
                        <Message.Content>
                            No effects found :/
                    </Message.Content>
                    </Message>
                }
                { pipeline &&
                    <div>
                        <List bulleted horizontal>
                            { list.map(fx => (
                                <List.Item 
                                    disabled={ !fx.isValid() }
                                    as={ (fx.name === active ? 'b' : 'a') }
                                    onClick={ () => this.pickEffect(fx.name) }
                                >
                                    { fx.name }
                                </List.Item>
                            )) }
                        </List>
                        <div>
                            <Button.Group compact >
                                <Button
                                    icon='playback pause'
                                    color={ (pipeline.isStopped() ? 'black' : null) }
                                    disabled={ pipeline.isStopped() }
                                    onClick={ this.handlePauseClick }
                                />
                                <Button
                                    icon='playback play'
                                    color={ (!pipeline.isStopped() ? 'black' : null) }
                                    disabled={ !pipeline.isStopped() }
                                    onClick={ this.handlePlayClick }
                                />
                            </Button.Group>
                            <ThreeScene
                                style={ threeStylesHotfix }
                                emitter={ pipeline.emitter }
                            />
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getSourceCode), mapActions(sourceActions))(Playground) as any;
