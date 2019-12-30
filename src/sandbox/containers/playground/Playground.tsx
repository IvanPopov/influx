/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { filterPartFx, getEmitterName, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, List, Message } from 'semantic-ui-react';

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
    $emitterName: string = null;

    constructor(props) {
        super(props);
    }

    // static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
    //     return null;
    // }

    @autobind
    handlePlayClick() {
        const props = this.props;
        if (props.emitter) {
            if (props.emitter.isStopped()) {
                props.emitter.start();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.emitter) {
            if (!props.emitter.isStopped()) {
                props.emitter.stop();
                this.forceUpdate();
            }
        }
    }


    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.emitter !== this.props.emitter ||
            (this.props.emitter && this.$emitterName !== this.props.emitter.name);
    }

    componentDidUpdate() {
        if (this.props.emitter) {
            this.$emitterName = this.props.emitter.name;
        } else {
            this.$emitterName = null;
        }
    }


    render() {
        // console.log('Playground:render()');
        const props = this.props;
        const emitter = props.emitter;
        const scope = getScope(props);

        const list: IPartFxInstruction[] = filterPartFx(scope);
        const active = getEmitterName(props);

        return (
            <div>
                { !list.length &&
                    <Message info textAlign='center'>
                        <Message.Content>
                            No effects found :/
                    </Message.Content>
                    </Message>
                }
                { emitter &&
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
                                    color={ (emitter.isStopped() ? 'black' : null) }
                                    disabled={ emitter.isStopped() }
                                    onClick={ this.handlePauseClick }
                                />
                                <Button
                                    icon='playback play'
                                    color={ (!emitter.isStopped() ? 'black' : null) }
                                    disabled={ !emitter.isStopped() }
                                    onClick={ this.handlePlayClick }
                                />
                            </Button.Group>
                            <ThreeScene
                                style={ threeStylesHotfix }
                                emitter={ emitter }
                            />
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getFileState), mapActions(sourceActions))(Playground) as any;
